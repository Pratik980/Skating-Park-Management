import React, { useEffect, useState } from 'react';
import { summaryAPI, ticketsAPI } from '../api/api';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#4c8cf5', '#2ecc71', '#f39c12', '#ef4444', '#9b59b6', '#0ea5e9', '#ff6b6b'];

const ChartsDashboard = () => {
  const { currentBranch } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState({
    timeline: [],
    types: [],
    hourly: [],
    topCustomers: [],
    checkedIn: 0,
    lastUpdate: new Date()
  });

  const fetchData = async () => {
    if (!currentBranch?._id) {
      setError('No branch selected. Please choose a branch.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Backend fetch
      const dashboardRes = await summaryAPI.getDashboard(currentBranch._id);
      const statsRes = await ticketsAPI.getStats(currentBranch._id, 'today');
      const dashboard = dashboardRes?.data?.dashboard || {};
      const stats = statsRes?.data?.stats || {};
      console.log('ChartsDashboard::raw', { dashboardRes, statsRes, dashboard, stats });
      // Timeline data
      const timeline = (dashboard.timeline || []).map(e => ({
        date: e.label,
        Tickets: e.tickets,
        Revenue: e.revenue,
        Refunds: e.refundedAmount,
      }));
      const typeCounts = dashboard.typeCounts || {};
      const typesArr = Object.entries(typeCounts).map(([type, value], i) => ({ name: type, value }));
      const hourlyArr = (stats.byHour || []).map(e => ({ hour: `${e.hour}:00`, Tickets: e.count }));
      const custList = (dashboard.customers || []).sort((a,b)=>b.tickets-a.tickets).slice(0,5).map(c=>({ name: c.name, Tickets: c.tickets }));
      const checkedIn = dashboard.checkedIn || 0;
      setChartData({
        timeline,
        types: typesArr,
        hourly: hourlyArr,
        topCustomers: custList,
        checkedIn,
        lastUpdate: new Date(),
      });
      // Smart message if empty
      if (
        timeline.length === 0 &&
        typesArr.length === 0 &&
        hourlyArr.length === 0 &&
        custList.length === 0
      ) {
        setError('No chart data available for this branch. Check your server or add ticket data.');
      }
    } catch (err) {
      setError('Failed to load chart data. Check server/API.');
      console.error('ChartsDashboard::error', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 60000); // poll every 60s
    return () => clearInterval(i);
  }, [currentBranch?._id]);

  return (
    <div style={{margin: '42px 0 26px 0', padding: '34px', borderRadius: 20, background: 'rgba(255,255,255,0.87)', boxShadow: '0 6px 32px #4c8cf516'}}> 
      <div style={{fontWeight:700,fontSize:'1.33em',marginBottom:10,letterSpacing:'-0.5px'}}>📊 Live Ticket Dashboard</div>
      {error && (
        <div style={{color:'#ef4444',marginBottom:14,fontSize:'1.06em',fontWeight:600}}>{error}</div>
      )}
      <div style={{display: 'flex', flexWrap: 'wrap', gap: '36px', justifyContent: 'space-between'}}>
        <div style={{flex:'1 1 360px', minWidth:340, height:290}}>
          <div style={{fontWeight:600,marginBottom:6}}>Tickets, Revenue & Refunds ({chartData.timeline.length})</div>
          <ResponsiveContainer width='100%' height={260}>
            <BarChart data={chartData.timeline} margin={{ top: 12, right: 24, left: -20, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11}/>
              <YAxis fontSize={11}/>
              <Tooltip/>
              <Legend/>
              <Bar dataKey="Tickets" fill="#4c8cf5" barSize={22}/>
              <Bar dataKey="Refunds" fill="#ef4444" barSize={18}/>
              <Line type="monotone" dataKey="Revenue" stroke="#2ecc71" strokeWidth={2} dot={false}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{flex:'1 1 240px', minWidth:220, height:290}}>
          <div style={{fontWeight:600,marginBottom:6}}>Ticket Types Breakdown</div>
          <ResponsiveContainer width='100%' height={220}>
            <PieChart>
              <Pie data={chartData.types} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {chartData.types.map((e,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]}/>))}
              </Pie>
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{flex:'1 0 280px', minWidth:220, height:290}}>
          <div style={{fontWeight:600,marginBottom:6}}>Top 5 Customers (Tickets)</div>
          <ResponsiveContainer width='100%' height={220}>
            <BarChart data={chartData.topCustomers} layout="vertical" margin={{ left: 16, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={11} allowDecimals={false}/>
              <YAxis type="category" dataKey="name" fontSize={11}/>
              <Tooltip/>
              <Bar dataKey="Tickets" fill="#f39c12" barSize={14}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{fontSize:11,color:'#708090',marginTop:14}}>Last updated: {chartData.lastUpdate.toLocaleTimeString()} (auto-refreshes every minute)</div>
      {loading && <div style={{marginTop:6,fontSize:12,color:'#ef4444'}}>Loading charts…</div>}
    </div>
  );
}
export default ChartsDashboard;
