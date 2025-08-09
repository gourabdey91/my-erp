import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/userAPI';
import '../../../shared/styles/unified-design.css';
import MobileCard from '../../../shared/components/MobileCard';
import './UserList.css';

const UserList = ({ onEditUser, onCreateUser, showForm, onCancelForm }) => {
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
    return (
      <div className="unified-container">
        <div className="unified-loading">Loading users...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Users</h1>
            <p>Manage system users and their access permissions. Create and edit user accounts with role-based access control.</p>
          </div>
          <button 
            className="unified-btn unified-btn-primary"
            onClick={() => {
              if (!showForm) {
                onCreateUser();
              } else {
                onCancelForm();
              }
            }}
            disabled={loading}
          >
            {showForm ? 'Cancel' : 'Add User'}
          </button>
        </div>
      </div>

      {error && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c33' }}>
            {error}
          </div>
        </div>
      )}

      {/* Content Section */}
      {!showForm && (
        <div className="unified-content">
          {users.length === 0 ? (
            <div className="empty-state">
              <p>No users found. Create your first user to get started.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="unified-table-responsive">
                <table className="unified-table">
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
                        <td>
                          <span className="name-text">{user.fullName}</span>
                        </td>
                        <td>{user.email}</td>
                        <td>{user.phone}</td>
                        <td>
                          <span className={`unified-status-badge ${user.role === 'admin' ? 'danger' : 'primary'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`unified-status-badge ${user.status === 'active' ? 'success' : 'warning'} clickable`}
                            onClick={() => handleStatusToggle(user._id, user.status)}
                            title="Click to toggle status"
                          >
                            {user.status}
                          </button>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="unified-table-actions">
                            <button
                              className="unified-table-action edit"
                              onClick={() => onEditUser(user)}
                              title="Edit user"
                              disabled={loading}
                            >
                              ✏️
                            </button>
                            <button
                              className="unified-table-action delete"
                              onClick={() => handleDeleteUser(user._id)}
                              title="Delete user"
                              disabled={loading}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="unified-mobile-cards">
                {users.map(user => (
                  <MobileCard
                    key={user._id}
                    id={user._id}
                    title={user.fullName}
                    subtitle={user.email}
                    badge={{
                      text: user.status,
                      type: user.status === 'active' ? 'success' : 'warning'
                    }}
                    fields={[
                      { label: 'Phone', value: user.phone || 'N/A' },
                      { label: 'Role', value: user.role },
                      { label: 'Created', value: new Date(user.createdAt).toLocaleDateString() }
                    ]}
                    actions={[
                      {
                        label: 'Edit',
                        onClick: () => onEditUser(user),
                        variant: 'primary',
                        disabled: loading
                      },
                      {
                        label: 'Delete',
                        onClick: () => handleDeleteUser(user._id),
                        variant: 'danger',
                        disabled: loading
                      },
                      {
                        label: user.status === 'active' ? 'Deactivate' : 'Activate',
                        onClick: () => handleStatusToggle(user._id, user.status),
                        variant: 'secondary',
                        disabled: loading
                      }
                    ]}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default UserList;
