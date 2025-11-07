export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('Không có dữ liệu để xuất');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvHeaders = headers.join(',');
  const csvRows = data.map((row) => {
    return headers.map((header) => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      // Handle objects/arrays - convert to JSON string
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      // Handle strings with commas - wrap in quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  const csvContent = [csvHeaders, ...csvRows].join('\n');
  
  // Add BOM for UTF-8 to support Vietnamese characters in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportAttendanceReportToCSV(reportData: any, filename: string) {
  const rows: any[] = [];
  
  // Add header row
  rows.push({
    'MSSV': 'MSSV',
    'Họ và Tên': 'Họ và Tên',
    'Email': 'Email',
    'Tổng số buổi học': 'Tổng số buổi học',
    'Số buổi có mặt': 'Số buổi có mặt',
    'Tỷ lệ chuyên cần (%)': 'Tỷ lệ chuyên cần (%)',
  });

  // Add data rows
  if (reportData.report) {
    reportData.report.forEach((student: any) => {
      rows.push({
        'MSSV': student.studentCode || '',
        'Họ và Tên': student.fullName || '',
        'Email': student.email || '',
        'Tổng số buổi học': student.totalSessions || 0,
        'Số buổi có mặt': student.attendedSessions || 0,
        'Tỷ lệ chuyên cần (%)': student.attendanceRate || 0,
      });
    });
  }

  exportToCSV(rows, filename);
}

