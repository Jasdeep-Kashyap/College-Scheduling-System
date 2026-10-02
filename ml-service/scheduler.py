"""
OR-Tools CP-SAT Timetable Scheduling Engine
Solves the college timetable scheduling as a Constraint Satisfaction Problem (CSP).
"""

import time
from datetime import date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from ortools.sat.python import cp_model

from schemas import (
    GenerateTimetableRequest,
    GenerateTimetableResponse,
    SessionAssignment,
)


def get_calendar_days(month: int, year: int, holidays: List[str], events: List[Dict]) -> List[date]:
    """Get working days for the month, excluding holidays and events."""
    blocked_dates = set(holidays)
    for ev in events:
        start = date.fromisoformat(ev["startDate"])
        end = date.fromisoformat(ev["endDate"])
        current = start
        while current <= end:
            blocked_dates.add(current.isoformat())
            current += timedelta(days=1)

    days = []
    d = date(year, month, 1)
    while d.month == month:
        if d.weekday() < 5 and d.isoformat() not in blocked_dates:  # Mon-Fri
            days.append(d)
        d += timedelta(days=1)
    return days


def solve_timetable(req: GenerateTimetableRequest) -> GenerateTimetableResponse:
    """
    Main CP-SAT solver for college timetable generation.
    """
    start_time = time.time()

    teachers = req.teachers
    batches = req.batches
    courses = req.courses
    rooms = req.rooms
    time_slots = req.timeSlots
    weights = req.solverWeights

    # Get working calendar days
    calendar_days = get_calendar_days(req.month, req.year, req.holidays, req.events)

    # For simplicity: 1 teacher per course (round-robin assignment based on load)
    # Build course-to-teacher mapping (simplified - in production would use course-teacher assignments)
    teacher_ids = [t.id for t in teachers]
    course_teacher_map: Dict[str, str] = {}
    lab_courses = [c for c in courses if c.type == "LAB"]
    theory_courses = [c for c in courses if c.type != "LAB"]

    for i, course in enumerate(theory_courses):
        course_teacher_map[course.id] = teacher_ids[i % len(teacher_ids)]
    for i, course in enumerate(lab_courses):
        course_teacher_map[course.id] = teacher_ids[(i + len(theory_courses)) % len(teacher_ids)]

    # Separate lecture and lab rooms
    lecture_rooms = [r for r in rooms if r.type == "LECTURE_HALL" or r.type == "SEMINAR_ROOM"]
    lab_rooms = [r for r in rooms if "LAB" in r.type]

    # Batch-course assignments (each batch gets all courses)
    assignments: List[Tuple[str, str, str]] = []  # (courseId, batchId, teacherId)
    for batch in batches:
        for course in courses:
            assignments.append((course.id, batch.id, course_teacher_map[course.id]))

    model = cp_model.CpModel()

    # Decision variables: for each (assignment, day_index, slot_index, room_index)
    # X[a][d][s][r] = 1 if assignment `a` is scheduled on day `d` at slot `s` in room `r`
    days = calendar_days
    slots = time_slots
    n_days = len(days)
    n_slots = len(slots)
    n_rooms = len(rooms)
    n_assignments = len(assignments)

    X = {}
    for a in range(n_assignments):
        course_id, batch_id, teacher_id = assignments[a]
        course = next(c for c in courses if c.id == course_id)
        # Filter compatible rooms
        if course.type == "LAB":
            compatible_room_indices = [i for i, r in enumerate(rooms) if "LAB" in r.type]
        else:
            compatible_room_indices = [i for i, r in enumerate(rooms) if "LAB" not in r.type]

        if not compatible_room_indices:
            compatible_room_indices = list(range(n_rooms))

        for d in range(n_days):
            for s in range(n_slots):
                for r in compatible_room_indices:
                    X[(a, d, s, r)] = model.NewBoolVar(f"x_{a}_{d}_{s}_{r}")

    # ------- HARD CONSTRAINT 1: Each assignment scheduled exactly weekly_hours / 4 times per month -------
    for a, (course_id, batch_id, _) in enumerate(assignments):
        course = next(c for c in courses if c.id == course_id)
        # Approximate: schedule weeklyHours sessions (capped to ensure feasibility)
        target = min(course.weeklyHours, n_days // 5 * course.weeklyHours)
        target = min(target, n_days)

        all_for_assignment = []
        for d in range(n_days):
            for s in range(n_slots):
                for r in range(n_rooms):
                    if (a, d, s, r) in X:
                        all_for_assignment.append(X[(a, d, s, r)])
        model.Add(sum(all_for_assignment) == min(target, 4))  # Cap for feasibility

    # ------- HARD CONSTRAINT 2: No teacher double booking -------
    for d in range(n_days):
        for s in range(n_slots):
            for teacher in teachers:
                vars_for_teacher = []
                for a, (_, _, tid) in enumerate(assignments):
                    if tid == teacher.id:
                        for r in range(n_rooms):
                            if (a, d, s, r) in X:
                                vars_for_teacher.append(X[(a, d, s, r)])
                if vars_for_teacher:
                    model.Add(sum(vars_for_teacher) <= 1)

    # ------- HARD CONSTRAINT 3: No room double booking -------
    for d in range(n_days):
        for s in range(n_slots):
            for r in range(n_rooms):
                vars_for_room = [X[(a, d, s, r)] for a in range(n_assignments) if (a, d, s, r) in X]
                if vars_for_room:
                    model.Add(sum(vars_for_room) <= 1)

    # ------- HARD CONSTRAINT 4: No batch overlap -------
    for d in range(n_days):
        for s in range(n_slots):
            for batch in batches:
                vars_for_batch = []
                for a, (_, bid, _) in enumerate(assignments):
                    if bid == batch.id:
                        for r in range(n_rooms):
                            if (a, d, s, r) in X:
                                vars_for_batch.append(X[(a, d, s, r)])
                if vars_for_batch:
                    model.Add(sum(vars_for_batch) <= 1)

    # ------- SOFT OBJECTIVE: Maximize slot desirability -------
    objective_terms = []
    for a in range(n_assignments):
        for d in range(n_days):
            for s, slot in enumerate(slots):
                for r in range(n_rooms):
                    if (a, d, s, r) in X:
                        desirability_score = int(slot.desirabilityScore * 10)
                        objective_terms.append(desirability_score * X[(a, d, s, r)])

    model.Maximize(sum(objective_terms))

    # Solve with time limit
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0
    solver.parameters.num_search_workers = 4

    status = solver.Solve(model)
    elapsed = int((time.time() - start_time) * 1000)

    sessions: List[SessionAssignment] = []
    if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        for a, (course_id, batch_id, teacher_id) in enumerate(assignments):
            for d, day in enumerate(days):
                for s, slot in enumerate(slots):
                    for r, room in enumerate(rooms):
                        if (a, d, s, r) in X and solver.Value(X[(a, d, s, r)]) == 1:
                            sessions.append(SessionAssignment(
                                courseId=course_id,
                                teacherId=teacher_id,
                                batchId=batch_id,
                                roomId=room.id,
                                timeSlotId=slot.id,
                                date=day.isoformat(),
                            ))

    solver_status = "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE" if status == cp_model.FEASIBLE else "INFEASIBLE"

    # Calculate fairness Gini
    teacher_undesirable: Dict[str, int] = {t.id: 0 for t in teachers}
    undesirable_slot_ids = {slot.id for slot in slots if slot.desirabilityScore <= 2.0}
    for s in sessions:
        if s.timeSlotId in undesirable_slot_ids:
            teacher_undesirable[s.teacherId] = teacher_undesirable.get(s.teacherId, 0) + 1

    values = list(teacher_undesirable.values())
    n = len(values)
    mean_val = sum(values) / n if n > 0 else 0
    gini = 0.0
    if mean_val > 0:
        total = sum(abs(values[i] - values[j]) for i in range(n) for j in range(n))
        gini = total / (2 * n * n * mean_val)

    return GenerateTimetableResponse(
        status=solver_status,
        fairnessGini=round(gini, 3),
        sessions=sessions,
        executionTimeMs=elapsed,
        message=f"Generated {len(sessions)} sessions in {elapsed}ms",
    )
