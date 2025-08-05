import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/userAPI';
import './UserList.css';

const UserList = ({ onEditUser, onCreateUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUsers();
      setUsers(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userAPI.deleteUser(userId);
        setUsers(users.filter(user => user._id !== userId));
      } catch (err) {
        setError('Failed to delete user');
        console.error('Error deleting user:', err);
      }
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const response = await userAPI.updateUserStatus(userId, newStatus);
      setUsers(users.map(user => 
        user._id === userId ? response.data.data : user
      ));
    } catch (err) {
      setError('Failed to update user status');
      console.error('Error updating user status:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="user-list">
      <div className="user-list-header">
        <h2>Users</h2>
        <button className="btn btn-primary" onClick={onCreateUser}>
          Add New User
        </button>
      </div>

      {users.length === 0 ? (
        <div className="no-users">
          <p>No users found. Create your first user!</p>
        </div>
      ) : (
        <div className="user-table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td data-label="Name">{user.fullName}</td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Phone">{user.phone}</td>
                  <td data-label="Role">
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td data-label="Status">
                    <button
                      className={`status-badge status-${user.status}`}
                      onClick={() => handleStatusToggle(user._id, user.status)}
                      title="Click to toggle status"
                    >
                      {user.status}
                    </button>
                  </td>
                  <td data-label="Created">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td data-label="Actions">
                    <div className="action-buttons">
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => onEditUser(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserList;
