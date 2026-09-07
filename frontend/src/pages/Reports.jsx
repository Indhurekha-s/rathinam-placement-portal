import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Reports({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('placed'); // placed, unplaced, companies, departments

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/reports/summary', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to load report data');
      setData(resData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Export CSV Helper Client-side
  const exportCSV = (type) => {
    if (!data) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = `Rathinam_Report_${type}.csv`;

    if (type === 'placed') {
      csvContent += "Roll Number,Student Name,Department,CTC (LPA),Company Name\n";
      data.placedList.forEach(row => {
        csvContent += `"${row.roll_number}","${row.name}","${row.department}",${row.ctc},"${row.company_name}"\n`;
      });
    } else if (type === 'unplaced') {
      csvContent += "Roll Number,Student Name,Department,Current Phase,ATS Score\n";
      data.unplacedList.forEach(row => {
        csvContent += `"${row.roll_number}","${row.name}","${row.department}","${row.current_phase}",${row.ats_score}\n`;
      });
    } else if (type === 'companies') {
      csvContent += "Company Name,CTC Offered (LPA),Total Selections\n";
      data.companyPlacements.forEach(row => {
        csvContent += `"${row.company_name}",${row.ctc},${row.placed_count}\n`;
      });
    } else if (type === 'departments') {
      csvContent += "Department,Total Students,Placed Students,Placement Percentage\n";
      data.deptPlacements.forEach(row => {
        const rate = row.total_students ? Math.round((row.placed_count / row.total_students) * 100) : 0;
        csvContent += `"${row.department}",${row.total_students},${row.placed_count},${rate}%\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPDFMock = (type) => {
    alert(`Generating PDF Report for '${type}'... (Standard system PDF layout is initialized and download is generated)`);
    window.print();
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading audit database reports...</div>;
  }

  const { placedList = [], unplacedList = [], companyPlacements = [], deptPlacements = [] } = data || {};

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'var(--font-title)' }}>Reports & Analytics Center</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Generate and export custom rosters for placed students, talent segments, and department performance statistics.
          </p>
        </div>
        <button onClick={fetchReports} className="btn btn-secondary">
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '12px', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      {/* Reports Selector Links */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1px' }}>
        <button
          onClick={() => setReportType('placed')}
          style={{
            padding: '10px 16px', background: 'none', border: 'none',
            borderBottom: reportType === 'placed' ? '3px solid var(--brand-green)' : '3px solid transparent',
            color: reportType === 'placed' ? 'var(--brand-green)' : 'var(--text-secondary)',
            fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Placed Student Roster
        </button>
        
        <button
          onClick={() => setReportType('unplaced')}
          style={{
            padding: '10px 16px', background: 'none', border: 'none',
            borderBottom: reportType === 'unplaced' ? '3px solid var(--color-error)' : '3px solid transparent',
            color: reportType === 'unplaced' ? 'var(--color-error)' : 'var(--text-secondary)',
            fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Yet To Be Placed Pool
        </button>

        <button
          onClick={() => setReportType('companies')}
          style={{
            padding: '10px 16px', background: 'none', border: 'none',
            borderBottom: reportType === 'companies' ? '3px solid var(--brand-blue)' : '3px solid transparent',
            color: reportType === 'companies' ? 'var(--brand-blue)' : 'var(--text-secondary)',
            fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Company Drive Summary
        </button>

        <button
          onClick={() => setReportType('departments')}
          style={{
            padding: '10px 16px', background: 'none', border: 'none',
            borderBottom: reportType === 'departments' ? '3px solid var(--brand-purple)' : '3px solid transparent',
            color: reportType === 'departments' ? 'var(--brand-purple)' : 'var(--text-secondary)',
            fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Department Performance
        </button>
      </div>

      {/* Export Controls for current selection */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button onClick={() => exportCSV(reportType)} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
          <Download size={14} />
          <span>Download CSV</span>
        </button>

        <button 
          onClick={() => {
            // Trigger Excel download API
            window.open(`/api/students/export/excel?token=${localStorage.getItem('token')}`);
          }} 
          className="btn btn-primary" 
          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
        >
          <Download size={14} />
          <span>Download Excel</span>
        </button>

        <button onClick={() => triggerPDFMock(reportType)} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
          <FileText size={14} />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Table Display */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        
        {reportType === 'placed' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-green)', marginBottom: '14px' }}>Placed Students & Offered Packages</h3>
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>Placed Company</th>
                    <th>CTC (LPA)</th>
                  </tr>
                </thead>
                <tbody>
                  {placedList.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{row.roll_number}</td>
                      <td style={{ color: '#fff' }}>{row.name}</td>
                      <td>{row.department}</td>
                      <td style={{ fontWeight: '600' }}>{row.company_name}</td>
                      <td style={{ fontWeight: '700', color: 'var(--brand-green)' }}>{row.ctc} LPA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'unplaced' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-error)', marginBottom: '14px' }}>Students Yet To Be Placed</h3>
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>Current Phase</th>
                    <th>ATS Score</th>
                  </tr>
                </thead>
                <tbody>
                  {unplacedList.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{row.roll_number}</td>
                      <td style={{ color: '#fff' }}>{row.name}</td>
                      <td>{row.department}</td>
                      <td>
                        <span className="badge badge-phase">{row.current_phase}</span>
                      </td>
                      <td style={{ fontWeight: '700', color: row.ats_score >= 60 ? 'var(--brand-orange)' : 'var(--text-muted)' }}>
                        {row.ats_score || 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'companies' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-blue)', marginBottom: '14px' }}>Company Selections & Offer Tallies</h3>
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>CTC Offered (LPA)</th>
                    <th>Offers Confirmed</th>
                  </tr>
                </thead>
                <tbody>
                  {companyPlacements.map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: '#fff', fontWeight: '600' }}>{row.company_name}</td>
                      <td>{row.ctc} LPA</td>
                      <td style={{ fontWeight: '700', color: 'var(--brand-green)' }}>{row.placed_count} Selections</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'departments' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-purple)', marginBottom: '14px' }}>Department Placement Tallies</h3>
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Department Name</th>
                    <th>Total Students Registered</th>
                    <th>Students Placed</th>
                    <th>Placement Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {deptPlacements.map((row, i) => {
                    const rate = row.total_students ? Math.round((row.placed_count / row.total_students) * 100) : 0;
                    return (
                      <tr key={i}>
                        <td style={{ color: '#fff', fontWeight: '600' }}>{row.department}</td>
                        <td>{row.total_students} Candidates</td>
                        <td>{row.placed_count} Placed</td>
                        <td style={{ fontWeight: '800', color: rate >= 70 ? 'var(--brand-green)' : 'var(--brand-orange)' }}>
                          {rate}% Placed
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
