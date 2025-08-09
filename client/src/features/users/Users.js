import React, { useState } from 'react';
import UserList from './components/UserList';
import UserForm from './components/UserForm';
import '../../shared/styles/unified-design.css';
import './Users.css';
import { scrollToTop } from '../../shared/utils/scrollUtils';

const Users = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowForm(true);
    scrollToTop();
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowForm(true);
    scrollToTop();
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
    <div className="unified-container">
      <UserList
        key={refreshKey}
        onCreateUser={handleCreateUser}
        onEditUser={handleEditUser}
        showForm={showForm}
        onCancelForm={handleFormCancel}
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
