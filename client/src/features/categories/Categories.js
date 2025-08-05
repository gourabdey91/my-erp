import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessUnit } from '../../contexts/BusinessUnitContext';
import { categoryAPI } from './services/categoryAPI';
import './Categories.css';

const Categories = () => {
  const { currentUser } = useAuth();
  const { currentBusinessUnit } = useBusinessUnit();
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
    if (!currentBusinessUnit?._id) return;
    
    try {
      setLoading(true);
      const response = await categoryAPI.getAll(currentBusinessUnit._id);
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
  }, [currentBusinessUnit]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const categoryData = {
        ...formData,
        businessUnitId: currentBusinessUnit._id,
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

  if (!currentBusinessUnit) {
    return <div className="loading">Loading business unit context...</div>;
  }

  return (
    <div className="categories-container">
      <div className="page-header">
        <h1>Surgical Categories</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          Add Surgical Category
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

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
              <button type="submit" className="btn btn-primary">
                {editingCategory ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="categories-list">
        {categories.length === 0 ? (
          <div className="empty-state">
            <p>No surgical categories found. Create your first surgical category to get started.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-container">
              <table className="categories-table">
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
                      <td className="code-cell">{category.code}</td>
                      <td className="description-cell">{category.description}</td>
                      <td className="status-cell">
                        <span className={`status-badge ${category.isActive ? 'active' : 'inactive'}`}>
                          {category.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleEdit(category)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(category)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="categories-mobile-cards">
              {categories.map((category) => (
                <div key={category._id} className="category-card">
                  <div className="category-card-header">
                    <div className="category-card-code">{category.code}</div>
                    <span className={`category-card-status ${category.isActive ? 'active' : 'inactive'}`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="category-card-description">
                    {category.description}
                  </div>
                  <div className="category-card-actions">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleEdit(category)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(category)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Categories;
