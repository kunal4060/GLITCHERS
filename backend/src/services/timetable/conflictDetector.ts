import type { ClassSession, ScheduleConflict } from '@glitchers/shared';

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function detectScheduleConflicts(classes: ClassSession[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < classes.length; i++) {
    const classA = classes[i];
    const startA = timeToMinutes(classA.startTime);
    const endA = timeToMinutes(classA.endTime);

    if (startA >= endA) {
      conflicts.push({
        type: 'INVALID_TIME',
        description: `Class "${classA.subjectName}" has an invalid time window (${classA.startTime} - ${classA.endTime}).`,
        classA,
      });
      continue;
    }

    for (let j = i + 1; j < classes.length; j++) {
      const classB = classes[j];

      if (classA.day !== classB.day) continue;

      const startB = timeToMinutes(classB.startTime);
      const endB = timeToMinutes(classB.endTime);

      // Check for exact duplicate
      if (
        classA.subjectName.toLowerCase() === classB.subjectName.toLowerCase() &&
        classA.startTime === classB.startTime &&
        classA.endTime === classB.endTime
      ) {
        conflicts.push({
          type: 'DUPLICATE',
          description: `Duplicate class found for "${classA.subjectName}" on ${classA.day} at ${classA.startTime}.`,
          classA,
          classB,
        });
        continue;
      }

      // Check for overlapping intervals: max(startA, startB) < min(endA, endB)
      const overlapStart = Math.max(startA, startB);
      const overlapEnd = Math.min(endA, endB);

      if (overlapStart < overlapEnd) {
        conflicts.push({
          type: 'OVERLAP',
          description: `Schedule clash: "${classA.subjectName}" (${classA.startTime}-${classA.endTime}) overlaps with "${classB.subjectName}" (${classB.startTime}-${classB.endTime}) on ${classA.day}.`,
          classA,
          classB,
        });
      }
    }
  }

  return conflicts;
}
