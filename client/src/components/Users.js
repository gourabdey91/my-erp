import React, { useState } from 'react';
import UserList from './UserList';
import UserForm from './UserForm';
import './Users.css';

const Users = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleFormSave = (savedUser) => {
    setShowForm(false);
    setEditingUser(null);
    // Trigger refresh of UserList
    setRefreshKey(prev => prev + 1);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  return (
    <div className="users-page">
      <UserList
        key={refreshKey}
        onCreateUser={handleCreateUser}
        onEditUser={handleEditUser}
      />

      {showForm && (
        <UserForm
          user={editingUser}
          isEdit={!!editingUser}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
};

export default Users;
