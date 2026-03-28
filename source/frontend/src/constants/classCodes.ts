export interface ClassCodeInfo {
  code: string;
  name: string;
}

export const CLASS_CODES: ClassCodeInfo[] = [
  { code: 'INT101', name: 'Service-oriented architecture' },
  { code: 'INT102', name: 'Web Development Fundamentals' },
  { code: 'INT103', name: 'Database Systems' },
  { code: 'INT104', name: 'Software Engineering' },
  { code: 'INT105', name: 'Mobile Application Development' },
  { code: 'INT201', name: 'Advanced Web Technologies' },
  { code: 'INT202', name: 'Cloud Computing' },
  { code: 'INT203', name: 'Machine Learning' },
  { code: 'INT204', name: 'Cybersecurity' },
  { code: 'INT205', name: 'Data Structures and Algorithms' },
  { code: 'CS101', name: 'Introduction to Computer Science' },
  { code: 'CS102', name: 'Programming Fundamentals' },
  { code: 'CS201', name: 'Object-Oriented Programming' },
  { code: 'CS202', name: 'Operating Systems' },
  { code: 'CS301', name: 'Computer Networks' },
  { code: 'CS302', name: 'Distributed Systems' },
];

export function getClassNameByCode(code: string): string | undefined {
  const classInfo = CLASS_CODES.find((c) => c.code === code);
  return classInfo?.name;
}

