

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const StudentAnalysisDashboard = () => {
  const [chartData, setChartData] = useState([]);
  const [totalsBySubject, setTotalsBySubject] = useState([]);
  const [insights, setInsights] = useState({});

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Check for required columns
        if (!jsonData[0]?.['Subject'] || !jsonData[0]?.['Grade']) {
          console.error('Missing required columns: Subject or Grade');
          return;
        }

        // Extract unique grades and subjects dynamically
        const uniqueGrades = [...new Set(jsonData.map((row) => row['Grade']))];
        const uniqueSubjects = [...new Set(jsonData.map((row) => row['Subject']))];

        // Create a full matrix of grade-subject combinations
        const fullMatrix = uniqueGrades.flatMap((grade) =>
          uniqueSubjects.map((subject) => ({
            Grade: grade,
            Subject: subject,
            "On Level": 0,
            "Below Level": 0,
          }))
        );

        // Merge original data into the matrix
        const mergedData = fullMatrix.map((entry) => {
          const match = jsonData.find(
            (row) => row['Grade'] === entry.Grade && row['Subject'] === entry.Subject
          );
          return {
            ...entry,
            "On Level": match?.['On Level'] || 0,
            "Below Level": match?.['Below Level'] || 0,
          };
        });

        // Initialize gradeTotals and subjectTotals
        const gradeTotals = uniqueGrades.reduce((acc, grade) => {
          acc[grade] = { onLevel: 0, total: 0 };
          return acc;
        }, {});
        const subjectTotals = uniqueSubjects.reduce((acc, subject) => {
          acc[subject] = { onLevel: 0, belowLevel: 0, total: 0 };
          return acc;
        }, {});

        const updatedChartData = mergedData.map((row) => {
          const { Subject, Grade, "On Level": onLevel, "Below Level": belowLevel } = row;
          const total = onLevel + belowLevel;

          // Update totals
          if (gradeTotals[Grade]) {
            gradeTotals[Grade].onLevel += onLevel;
            gradeTotals[Grade].total += total;
          }
          if (subjectTotals[Subject]) {
            subjectTotals[Subject].onLevel += onLevel;
            subjectTotals[Subject].belowLevel += belowLevel;
            subjectTotals[Subject].total += total;
          }

          // Prepare chart data
          return {
            Subject,
            Grade,
            onLevelPercentage: total > 0 ? ((onLevel / total) * 100).toFixed(1) : 0,
            belowLevelPercentage: total > 0 ? ((belowLevel / total) * 100).toFixed(1) : 0,
          };
        });

        // Sort chart data by Subject then Grade
        const sortedChartData = [...updatedChartData].sort((a, b) => {
          if (a.Subject < b.Subject) return -1;
          if (a.Subject > b.Subject) return 1;
          if (a.Grade < b.Grade) return -1;
          if (a.Grade > b.Grade) return 1;
          return 0;
        });

        // Prepare totals for table
        const totalsArray = Object.keys(subjectTotals).map((subject) => {
          const totalStudents = subjectTotals[subject].total;
          return {
            subject,
            onLevelPercentage: totalStudents > 0
              ? ((subjectTotals[subject].onLevel / totalStudents) * 100).toFixed(1)
              : 0,
            belowLevelPercentage: totalStudents > 0
              ? ((subjectTotals[subject].belowLevel / totalStudents) * 100).toFixed(1)
              : 0,
          };
        });

        setChartData(sortedChartData);
        setTotalsBySubject(totalsArray);

        // Generate insights dynamically
        const subjectPerformance = totalsArray.sort((a, b) => b.onLevelPercentage - a.onLevelPercentage);
        const strongestSubjects = subjectPerformance.slice(0, 3);
        const weakestSubjects = subjectPerformance.slice(-2);

        const gradePerformance = uniqueGrades.map((grade) => {
          const onLevelPercentage = gradeTotals[grade].total > 0
            ? ((gradeTotals[grade].onLevel / gradeTotals[grade].total) * 100).toFixed(1)
            : 0;
          return { grade, onLevelPercentage: parseFloat(onLevelPercentage) };
        });

        gradePerformance.sort((a, b) => b.onLevelPercentage - a.onLevelPercentage);

        const priorityClasses = sortedChartData
          .filter((row) => row.onLevelPercentage < 70)
          .sort((a, b) => a.onLevelPercentage - b.onLevelPercentage)
          .slice(0, 3);

        setInsights({
          strongestSubjects,
          weakestSubjects,
          gradePerformance,
          priorityClasses,
        });
      } catch (error) {
        console.error('Error processing file:', error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
      }}
    >
      <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>WIST Student Level Analysis</h2>
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={(e) => handleFileUpload(e.target.files[0])}
        style={{ marginBottom: '20px' }}
      />

      {/* Table for Percentages */}
      {totalsBySubject.length > 0 && (
        <div style={{ marginBottom: '40px', width: '100%', maxWidth: '600px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Subject</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>On Level (%)</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Below Level (%)</th>
              </tr>
            </thead>
            <tbody>
              {totalsBySubject.map((stat) => (
                <tr key={stat.subject}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{stat.subject}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{stat.onLevelPercentage}%</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{stat.belowLevelPercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Horizontal Bar Chart */}
      {chartData.length > 0 && (
        <div style={{ width: '100%', maxWidth: '600px', marginBottom: '40px' }}>
          <ResponsiveContainer width="100%" height={1000}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 20, right: 0, left: 0, bottom: 5 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(tick) => `${tick}%`} />
              <YAxis
                type="category"
                dataKey={(row) => `${row.Subject} ${row.Grade}`}
                width={150}
              />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Bar dataKey="onLevelPercentage" name="On Level (%)" fill="#0088FE" barSize={20} />
              <Bar dataKey="belowLevelPercentage" name="Below Level (%)" fill="#FF8042" barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Insights Section */}
      {insights.strongestSubjects && (
        <div style={{ width: '100%', maxWidth: '600px', marginTop: '20px', textAlign: 'left' }}>
          <h3 style={{ marginBottom: '10px' }}>Analytic Insights</h3>
          <h4>1. Subject Performance:</h4>
          <p>
            <strong>Strongest:</strong> {insights.strongestSubjects.map((s) => `${s.subject} (${s.onLevelPercentage}%)`).join(', ')}
          </p>
          <p>
            <strong>Weakest:</strong> {insights.weakestSubjects.map((w) => `${w.subject} (${w.onLevelPercentage}%)`).join(', ')}
          </p>

          <h4>2. Grade-Level Performance:</h4>
          <p>
            {insights.gradePerformance.map((g, index) => (
              <span key={g.grade}>
                {g.grade}: {index === 0 ? 'Strongest' : index === insights.gradePerformance.length - 1 ? 'Needs most attention' : 'Moderate'} at {g.onLevelPercentage}% on level<br />
              </span>
            ))}
          </p>

          <h4>3. Priority Classes Needing Support:</h4>
          <p>
            {insights.priorityClasses.map((p) => (
              <span key={`${p.Grade}-${p.Subject}`}>
                {p.Subject} {p.Grade} ({p.onLevelPercentage}% on level)<br />
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentAnalysisDashboard;
