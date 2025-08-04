import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <label htmlFor="erp-input" style={{ fontSize: '24px', fontWeight: 'bold' }}>My erp</label>
      <br />
      <input id="erp-input" type="text" style={{ marginTop: '20px', padding: '10px', fontSize: '18px' }} placeholder="Enter value..." />
    </div>
  );
}

export default App;
