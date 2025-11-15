# API Documentation - QR Attendance System

## Overview
QR Code and OTP-based attendance management system with GPS authentication. Backend runs on NestJS with Prisma ORM.

**Base URL**: `http://localhost:8080` (or according to PORT configuration)

---

## 1. Authentication Module (`/auth`)

### 1.1. Login
- **URL**: `POST /auth/login`
- **Public**: Yes (no JWT required)
- **Description**: Login to the system using username/email and password
- **Input (Body)**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Output**:
  ```json
  {
    "accessToken": "string",
    "user": {
      "id": "string",
      "email": "string",
      "fullName": "string",
      "studentCode": "string | null",
      "role": "STUDENT | LECTURER | ADMIN"
    }
  }
  ```
- **Possible Errors**:
  - `401 Unauthorized`: Incorrect password or account does not exist

---

### 1.2. Get Current User
- **URL**: `GET /auth/me`
- **Authentication**: JWT Required
- **Description**: Get information of the currently logged-in user
- **Input**: None (uses JWT from header `Authorization: Bearer <token>`)
- **Output**:
  ```json
  {
    "id": "string",
    "email": "string",
    "fullName": "string",
    "studentCode": "string | null",
    "role": "STUDENT | LECTURER | ADMIN"
  }
  ```

---

## 2. Attendance Module (`/attendance`)

### 2.1. Check-in by QR Code
- **URL**: `POST /attendance/checkin-qr`
- **Authentication**: JWT Required
- **Role**: STUDENT
- **Description**: Student checks in by scanning QR code, requires GPS within allowed range
- **Input (Body)**:
  ```json
  {
    "qrToken": "string",
    "lat": "number",
    "lng": "number",
    "accuracy": "number"
  }
  ```
- **Output**:
  ```json
  {
    "id": "string",
    "sessionId": "string",
    "studentId": "string",
    "method": "QR_GPS",
    "status": "APPROVED | TOO_FAR",
    "lat": "number",
    "lng": "number",
    "accuracy": "number",
    "otpUsed": null,
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
  ```
- **Possible Errors**:
  - `400 Bad Request`: Invalid or expired QR token, session does not exist
  - `401 Unauthorized`: Not enrolled in this class

---

### 2.2. Check-in by OTP and Photo
- **URL**: `POST /attendance/checkin-otp`
- **Authentication**: JWT Required
- **Role**: STUDENT
- **Description**: Student checks in using OTP and uploads photo as evidence (requires teacher approval)
- **Input (Form Data)**:
  - `file`: Image file (multipart/form-data, required)
  - `sessionId`: string (Session ID or publicCode)
  - `otp`: string (6-digit OTP code)
  - `meta`: JSON string
    ```json
    {
      "studentCode": "string",
      "timestamp": "string"
    }
    ```
- **Output**:
  ```json
  {
    "id": "string",
    "sessionId": "string",
    "studentId": "string",
    "method": "OTP_PHOTO",
    "status": "PENDING",
    "lat": null,
    "lng": null,
    "accuracy": null,
    "otpUsed": "string",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
  ```
- **Possible Errors**:
  - `400 Bad Request`: Image file is required, invalid or expired OTP, session does not exist
  - `401 Unauthorized`: Not enrolled in this class

---

### 2.3. Get Session Attendances
- **URL**: `GET /attendance/session/:id`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Get all attendance records for a session
- **Input (Path Parameter)**:
  - `id`: string (Session ID)
- **Output**: Array of attendance records
  ```json
  [
    {
      "id": "string",
      "sessionId": "string",
      "studentId": "string",
      "method": "QR_GPS | OTP_PHOTO | AUTO_IMPORT",
      "status": "NOT_ATTENDED | PENDING | APPROVED | REJECTED | TOO_FAR",
      "lat": "number | null",
      "lng": "number | null",
      "accuracy": "number | null",
      "otpUsed": "string | null",
      "createdAt": "ISO 8601 datetime",
      "updatedAt": "ISO 8601 datetime",
      "student": {
        "id": "string",
        "email": "string",
        "fullName": "string",
        "studentCode": "string | null"
      },
      "evidence": {
        "id": "string",
        "attendanceId": "string",
        "photoUrl": "string",
        "metaJson": "string"
      } | null
    }
  ]
  ```
- **Possible Errors**:
  - `400 Bad Request`: Session does not exist

---

### 2.4. Approve Attendance
- **URL**: `PATCH /attendance/:id/approve`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Teacher/Admin approves student attendance
- **Input (Path Parameter)**:
  - `id`: string (Attendance record ID)
- **Output**:
  ```json
  {
    "id": "string",
    "sessionId": "string",
    "studentId": "string",
    "method": "QR_GPS | OTP_PHOTO | AUTO_IMPORT",
    "status": "APPROVED",
    "lat": "number | null",
    "lng": "number | null",
    "accuracy": "number | null",
    "otpUsed": "string | null",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime",
    "student": {
      "id": "string",
      "email": "string",
      "fullName": "string",
      "studentCode": "string | null",
      "role": "STUDENT | LECTURER | ADMIN"
    },
    "evidence": {
      "id": "string",
      "attendanceId": "string",
      "photoUrl": "string",
      "metaJson": "string"
    } | null
  }
  ```

---

### 2.5. Reject Attendance
- **URL**: `PATCH /attendance/:id/reject`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Teacher/Admin rejects student attendance
- **Input (Path Parameter)**:
  - `id`: string (Attendance record ID)
- **Output**: Similar to approve, but `status` is `"REJECTED"`

---

### 2.6. Get Class Attendance Report
- **URL**: `GET /attendance/report/class/:classId`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Get detailed attendance report for a class
- **Input (Path Parameter)**:
  - `classId`: string (Class ID)
- **Output**:
  ```json
  {
    "class": {
      "id": "string",
      "code": "string",
      "name": "string"
    },
    "totalSessions": "number",
    "totalStudents": "number",
    "report": [
      {
        "studentId": "string",
        "studentCode": "string",
        "fullName": "string",
        "email": "string",
        "totalSessions": "number",
        "attendedSessions": "number",
        "attendanceRate": "number",
        "sessionDetails": [
          {
            "sessionId": "string",
            "sessionTitle": "string",
            "sessionDate": "ISO 8601 datetime",
            "status": "NOT_ATTENDED | PENDING | APPROVED | REJECTED | TOO_FAR",
            "method": "QR_GPS | OTP_PHOTO | AUTO_IMPORT | null",
            "checkedInAt": "ISO 8601 datetime | null"
          }
        ]
      }
    ]
  }
  ```
- **Possible Errors**:
  - `400 Bad Request`: Class does not exist

---

### 2.7. Get All Classes Attendance Report
- **URL**: `GET /attendance/report/all`
- **Authentication**: JWT Required
- **Role**: ADMIN
- **Description**: Get attendance report for all classes
- **Input**: None
- **Output**: Array of class reports
  ```json
  [
    {
      "class": {
        "id": "string",
        "code": "string",
        "name": "string"
      },
      "totalSessions": "number",
      "totalStudents": "number",
      "students": [
        {
          "studentId": "string",
          "studentCode": "string",
          "fullName": "string",
          "email": "string",
          "totalSessions": "number",
          "attendedSessions": "number",
          "attendanceRate": "number"
        }
      ]
    }
  ]
  ```

---

## 3. Sessions Module (`/sessions`)

### 3.1. Create Session
- **URL**: `POST /sessions`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Create a new session with QR code and OTP
- **Input (Body)**:
  ```json
  {
    "classId": "string",
    "title": "string",
    "startTime": "ISO 8601 datetime string",
    "endTime": "ISO 8601 datetime string",
    "latitude": "number",
    "longitude": "number",
    "geofenceRadius": "number",
    "publicCode": "string"
  }
  ```
- **Output**: Session object
  ```json
  {
    "id": "string",
    "classId": "string",
    "title": "string",
    "startTime": "ISO 8601 datetime",
    "endTime": "ISO 8601 datetime",
    "latitude": "number",
    "longitude": "number",
    "geofenceRadius": "number",
    "otpSecret": "string",
    "publicCode": "string",
    "createdAt": "ISO 8601 datetime"
  }
  ```
- **Note**: When creating a session, the system automatically:
  - Imports 100 students (523H0001 - 523H0100) into the class if not already present
  - Creates NOT_ATTENDED attendance records for all students
- **Possible Errors**:
  - `400 Bad Request`: Public code is required, public code already exists

---

### 3.2. Update Session
- **URL**: `PATCH /sessions/:id`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Update session information
- **Input (Path Parameter)**:
  - `id`: string (Session ID)
- **Input (Body)** - All fields are optional:
  ```json
  {
    "classId": "string",
    "title": "string",
    "startTime": "ISO 8601 datetime string",
    "endTime": "ISO 8601 datetime string",
    "latitude": "number",
    "longitude": "number",
    "geofenceRadius": "number",
    "publicCode": "string"
  }
  ```
- **Output**: Updated session object
- **Possible Errors**:
  - `404 Not Found`: Session does not exist
  - `400 Bad Request`: Public code cannot be empty, public code already exists

---

### 3.3. Get Session by ID
- **URL**: `GET /sessions/:id`
- **Authentication**: JWT Required
- **Description**: Get detailed information of a session
- **Input (Path Parameter)**:
  - `id`: string (Session ID)
- **Output**:
  ```json
  {
    "id": "string",
    "classId": "string",
    "title": "string",
    "startTime": "ISO 8601 datetime",
    "endTime": "ISO 8601 datetime",
    "latitude": "number",
    "longitude": "number",
    "geofenceRadius": "number",
    "otpSecret": "string",
    "publicCode": "string",
    "createdAt": "ISO 8601 datetime",
    "class": {
      "id": "string",
      "code": "string",
      "name": "string",
      "createdAt": "ISO 8601 datetime"
    },
    "attendances": [
      {
        "id": "string",
        "sessionId": "string",
        "studentId": "string",
        "method": "QR_GPS | OTP_PHOTO | AUTO_IMPORT",
        "status": "NOT_ATTENDED | PENDING | APPROVED | REJECTED | TOO_FAR",
        "lat": "number | null",
        "lng": "number | null",
        "accuracy": "number | null",
        "otpUsed": "string | null",
        "createdAt": "ISO 8601 datetime",
        "updatedAt": "ISO 8601 datetime",
        "student": {
          "id": "string",
          "email": "string",
          "fullName": "string",
          "studentCode": "string | null"
        },
        "evidence": {
          "id": "string",
          "attendanceId": "string",
          "photoUrl": "string",
          "metaJson": "string"
        } | null
      }
    ]
  }
  ```
- **Possible Errors**:
  - `404 Not Found`: Session does not exist

---

### 3.4. Get Session by Public Code
- **URL**: `GET /sessions/code/:code`
- **Authentication**: JWT Required
- **Description**: Get session information by public code (publicCode)
- **Input (Path Parameter)**:
  - `code`: string (Session public code)
- **Output**: Similar to `GET /sessions/:id`
- **Possible Errors**:
  - `404 Not Found`: Session does not exist

---

### 3.5. Get QR Token
- **URL**: `GET /sessions/:id/qr`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Get QR token (JWT) to generate QR code for the session
- **Input (Path Parameter)**:
  - `id`: string (Session ID)
- **Output**:
  ```json
  {
    "token": "string",
    "payload": {
      "sessionId": "string",
      "classCode": "string",
      "className": "string",
      "nonce": "string",
      "exp": "number"
    },
    "deepLink": "string | null"
  }
  ```
- **Possible Errors**:
  - `404 Not Found`: Session does not exist

---

### 3.6. Get OTP
- **URL**: `GET /sessions/:id/otp`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Get current OTP (TOTP) for the session
- **Input (Path Parameter)**:
  - `id`: string (Session ID)
- **Output**:
  ```json
  {
    "otp": "string"
  }
  ```
- **Possible Errors**:
  - `404 Not Found`: Session does not exist
- **Note**: OTP changes periodically (default 30-60 seconds depending on configuration)

---

### 3.7. Delete Session by ID
- **URL**: `DELETE /sessions/:id`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Delete a session
- **Input (Path Parameter)**:
  - `id`: string (Session ID)
- **Output**:
  ```json
  {
    "success": true
  }
  ```
- **Possible Errors**:
  - `404 Not Found`: Session does not exist

---

### 3.8. Delete Session by Code
- **URL**: `DELETE /sessions/code/:code`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Delete a session by public code
- **Input (Path Parameter)**:
  - `code`: string (Session public code)
- **Output**:
  ```json
  {
    "success": true
  }
  ```
- **Possible Errors**:
  - `404 Not Found`: Session does not exist

---

## 4. Classes Module (`/classes`)

### 4.1. Get All Classes
- **URL**: `GET /classes`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Get list of all classes
- **Input**: None
- **Output**: Array of classes
  ```json
  [
    {
      "id": "string",
      "code": "string",
      "name": "string",
      "createdAt": "ISO 8601 datetime",
      "sessions": [
        {
          "id": "string",
          "publicCode": "string",
          "title": "string",
          "startTime": "ISO 8601 datetime",
          "endTime": "ISO 8601 datetime"
        }
      ],
      "_count": {
        "students": "number"
      }
    }
  ]
  ```

---

### 4.2. Create Class
- **URL**: `POST /classes`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Create a new class
- **Input (Body)**:
  ```json
  {
    "code": "string",
    "name": "string"
  }
  ```
- **Output**:
  ```json
  {
    "id": "string",
    "code": "string",
    "name": "string",
    "createdAt": "ISO 8601 datetime"
  }
  ```

---

### 4.3. Get Class by ID
- **URL**: `GET /classes/:id`
- **Authentication**: JWT Required
- **Description**: Get detailed information of a class
- **Input (Path Parameter)**:
  - `id`: string (Class ID)
- **Output**:
  ```json
  {
    "id": "string",
    "code": "string",
    "name": "string",
    "createdAt": "ISO 8601 datetime",
    "students": [
      {
        "id": "string",
        "classId": "string",
        "studentId": "string",
        "student": {
          "id": "string",
          "email": "string",
          "fullName": "string",
          "studentCode": "string | null"
        }
      }
    ],
    "sessions": [
      {
        "id": "string",
        "classId": "string",
        "title": "string",
        "startTime": "ISO 8601 datetime",
        "endTime": "ISO 8601 datetime",
        "latitude": "number",
        "longitude": "number",
        "geofenceRadius": "number",
        "otpSecret": "string",
        "publicCode": "string",
        "createdAt": "ISO 8601 datetime"
      }
    ]
  }
  ```
- **Possible Errors**:
  - `404 Not Found`: Class does not exist

---

### 4.4. Enroll Students
- **URL**: `POST /classes/:id/enroll`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Description**: Enroll students into a class using student codes or user IDs
- **Input (Path Parameter)**:
  - `id`: string (Class ID)
- **Input (Body)**:
  ```json
  {
    "studentCodes": ["string"],
    "userIds": ["string"]
  }
  ```
- **Output**: Array of enrollment records
  ```json
  [
    {
      "id": "string",
      "classId": "string",
      "studentId": "string"
    }
  ]
  ```
- **Possible Errors**:
  - `404 Not Found`: Class does not exist
  - `400 Bad Request`: Student with student code does not exist
- **Note**: If student is already enrolled, it will be skipped (no duplicate created)

---

## 5. Static Files

### 5.1. Get Upload File
- **URL**: `GET /uploads/:filename`
- **Public**: Yes (no JWT required)
- **Description**: Access uploaded image files (attendance evidence)
- **Input (Path Parameter)**:
  - `filename`: string (File name, e.g., `7d5aac68a5aa1e1feafcffa7ecda561a.jpg`)
- **Output**: Image file (image/jpeg, image/png, etc.)

---

## Authentication & Authorization

### JWT Token
- All APIs (except `/auth/login` and `/uploads/*`) require JWT token in header:
  ```
  Authorization: Bearer <accessToken>
  ```
- Token expires in 7 days (according to configuration)

### Roles
- **STUDENT**: Student, can check in
- **LECTURER**: Lecturer, can manage classes and sessions, approve attendance
- **ADMIN**: Administrator, has all permissions

### Public Endpoints
- `POST /auth/login`
- `GET /uploads/:filename`

---

## Enums

### Role
- `STUDENT`
- `LECTURER`
- `ADMIN`

### AttendanceMethod
- `QR_GPS`: Check-in using QR code and GPS
- `OTP_PHOTO`: Check-in using OTP and photo
- `AUTO_IMPORT`: Automatically imported when creating session

### AttendanceStatus
- `NOT_ATTENDED`: Not attended
- `PENDING`: Pending approval (OTP_PHOTO)
- `APPROVED`: Approved
- `REJECTED`: Rejected
- `TOO_FAR`: Too far from allowed GPS location

---

## Error Responses

All errors return the following format:
```json
{
  "statusCode": "number",
  "message": "string | string[]",
  "error": "string"
}
```

Example:
```json
{
  "statusCode": 400,
  "message": "Invalid or expired QR token",
  "error": "Bad Request"
}
```

---

## Notes

1. **GPS Geofencing**: When checking in with QR, the system checks GPS distance. If too far (> geofenceRadius), status will be `TOO_FAR`.

2. **OTP**: OTP uses TOTP (Time-based One-Time Password), changes periodically (default 30-60 seconds).

3. **Auto Import**: When creating a new session, the system automatically imports 100 students (523H0001 - 523H0100) and creates `NOT_ATTENDED` attendance records.

4. **File Upload**: Image files are stored in `backend/uploads/` directory and accessed via `/uploads/:filename`.

5. **CORS**: Backend allows CORS from localhost and serveo.net, loclx.io domains.
