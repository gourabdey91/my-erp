import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { categoryAPI } from './services/categoryAPI';
import MobileCard from '../../shared/components/MobileCard';
import '../../shared/styles/unified-design.css';
import './Categories.css';

const Categories = () => {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    description: ''
  });

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoryAPI.getAll();
      if (response.success) {
        setCategories(response.data);
      } else {
        setError(response.message || 'Failed to load surgical categories');
      }
    } catch (err) {
      setError('Failed to load surgical categories');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const categoryData = {
        ...formData,
        createdBy: currentUser.id,
        updatedBy: currentUser.id
      };

      if (editingCategory) {
        await categoryAPI.update(editingCategory._id, {
          ...categoryData,
          createdBy: editingCategory.createdBy
        });
      } else {
        await categoryAPI.create(categoryData);
      }

      setFormData({ code: '', description: '' });
      setShowForm(false);
      setEditingCategory(null);
      loadCategories();
    } catch (err) {
      setError(editingCategory ? 'Failed to update surgical category' : 'Failed to create surgical category');
      console.error('Error saving category:', err);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      code: category.code,
      description: category.description
    });
    setShowForm(true);
  };

  const handleDelete = async (category) => {
    if (window.confirm(`Are you sure you want to delete surgical category "${category.code}"?`)) {
      try {
        await categoryAPI.delete(category._id, currentUser.id);
        loadCategories();
      } catch (err) {
        setError('Failed to delete surgical category');
        console.error('Error deleting category:', err);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ code: '', description: '' });
    setShowForm(false);
    setEditingCategory(null);
  };

  if (loading) {
    return <div className="loading">Loading surgical categories...</div>;
  }

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Surgical Categories</h1>
            <p>Manage surgical category types for medical procedures.</p>
          </div>
          <button 
            className="unified-btn unified-btn-primary"
            onClick={() => setShowForm(true)}
          >
            Add Surgical Category
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

      {showForm && (
        <div className="form-container">
          <div className="form-header">
            <h2>{editingCategory ? 'Edit Surgical Category' : 'Add New Surgical Category'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="category-form">
            <div className="form-group">
              <label htmlFor="code">Category Code *</label>
              <input
                type="text"
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                maxLength="10"
                placeholder="Enter surgical category code"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <input
                type="text"
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                maxLength="100"
                placeholder="Enter surgical category description"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="unified-btn unified-btn-primary">
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
              <button type="button" className="unified-btn unified-btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="unified-content">
        {categories.length === 0 ? (
          <div className="empty-state">
            <p>No surgical categories created yet. Create your first surgical category to get started.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="unified-table-responsive">
              <table className="unified-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category._id}>
                      <td>
                        <span className="code-badge">{category.code}</span>
                      </td>
                      <td>
                        <span className="name-text">{category.description}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${category.isActive ? 'active' : 'inactive'}`}>
                          {category.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="unified-table-actions">
                          <button
                            className="unified-table-action edit"
                            onClick={() => handleEdit(category)}
                            title="Edit Category"
                            disabled={loading}
                          >
                            ✏️
                          </button>
                          <button
                            className="unified-table-action delete"
                            onClick={() => handleDelete(category)}
                            title="Delete Category"
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
              {categories.map((category) => (
                <MobileCard
                  key={category._id}
                  id={category._id}
                  title={category.description}
                  badge={category.code}
                  fields={[
                    { 
                      label: 'Status', 
                      value: category.isActive ? 'Active' : 'Inactive' 
                    }
                  ]}
                  actions={[
                    {
                      label: 'Edit',
                      icon: '✏️',
                      onClick: () => handleEdit(category)
                    },
                    {
                      label: 'Delete',
                      icon: '🗑️',
                      variant: 'danger',
                      onClick: () => handleDelete(category)
                    }
                  ]}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Categories;
