import React, { useState, useEffect } from 'react';
import FormField from '../../shared/components/transaction/FormField';

const ItemManagement = ({ 
  items = [], 
  onItemsChange, 
  dropdownData = {}, 
  disabled = false 
}) => {
  const [currentItems, setCurrentItems] = useState(items);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [newItem, setNewItem] = useState({
    materialMaster: '',
    implantType: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    totalAmount: 0,
    notes: '',
    isActive: true
  });

  useEffect(() => {
    setCurrentItems(items);
  }, [items]);

  const handleAddItem = () => {
    setNewItem({
      materialMaster: '',
      implantType: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      notes: '',
      isActive: true
    });
    setEditingIndex(-1);
    setShowAddItem(true);
  };

  const handleEditItem = (index) => {
    setNewItem({ ...currentItems[index] });
    setEditingIndex(index);
    setShowAddItem(true);
  };

  const handleSaveItem = () => {
    const updatedItems = [...currentItems];
    
    // Calculate total amount if not provided
    const totalAmount = newItem.quantity * newItem.unitPrice;
    const itemToSave = {
      ...newItem,
      totalAmount,
      quantity: parseFloat(newItem.quantity) || 1,
      unitPrice: parseFloat(newItem.unitPrice) || 0
    };

    if (editingIndex >= 0) {
      updatedItems[editingIndex] = itemToSave;
    } else {
      updatedItems.push(itemToSave);
    }

    setCurrentItems(updatedItems);
    onItemsChange(updatedItems);
    setShowAddItem(false);
    setEditingIndex(-1);
  };

  const handleDeleteItem = (index) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      const updatedItems = currentItems.filter((_, i) => i !== index);
      setCurrentItems(updatedItems);
      onItemsChange(updatedItems);
    }
  };

  const handleCancelItem = () => {
    setShowAddItem(false);
    setEditingIndex(-1);
  };

  const handleItemChange = (field, value) => {
    setNewItem(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total amount when quantity or price changes
      if (field === 'quantity' || field === 'unitPrice') {
        updated.totalAmount = (updated.quantity || 0) * (updated.unitPrice || 0);
      }
      
      return updated;
    });
  };

  const calculateTotalQuantity = () => {
    return currentItems.reduce((total, item) => total + (parseFloat(item.quantity) || 0), 0);
  };

  const calculateTotalAmount = () => {
    return currentItems.reduce((total, item) => total + (parseFloat(item.totalAmount) || 0), 0);
  };

  return (
    <div className="item-management">
      <div className="item-management-header">
        <div className="item-summary">
          <span className="item-count">
            Items: {currentItems.length}
          </span>
          <span className="item-total-qty">
            Total Qty: {calculateTotalQuantity()}
          </span>
          <span className="item-total-amount">
            Total: ₹{calculateTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
        {!disabled && (
          <button
            type="button"
            className="unified-btn unified-btn-primary unified-btn-sm"
            onClick={handleAddItem}
          >
            ➕ Add Item
          </button>
        )}
      </div>

      {/* Items List */}
      {currentItems.length > 0 && (
        <div className="items-list">
          {currentItems.map((item, index) => (
            <div key={index} className="item-card">
              <div className="item-details">
                <div className="item-main-info">
                  <strong>{item.description || 'Item Description'}</strong>
                  {item.materialMaster && (
                    <span className="item-code">
                      Material: {dropdownData.materials?.find(m => m._id === item.materialMaster)?.description || item.materialMaster}
                    </span>
                  )}
                  {item.implantType && (
                    <span className="item-code">
                      Implant: {dropdownData.implantTypes?.find(i => i._id === item.implantType)?.name || item.implantType}
                    </span>
                  )}
                </div>
                <div className="item-quantities">
                  <span>Qty: {item.quantity}</span>
                  <span>Price: ₹{parseFloat(item.unitPrice).toLocaleString('en-IN')}</span>
                  <span className="item-total">
                    Total: ₹{parseFloat(item.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {item.notes && (
                  <div className="item-notes">
                    <small>{item.notes}</small>
                  </div>
                )}
              </div>
              {!disabled && (
                <div className="item-actions">
                  <button
                    type="button"
                    className="unified-btn unified-btn-secondary unified-btn-sm"
                    onClick={() => handleEditItem(index)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    className="unified-btn unified-btn-danger unified-btn-sm"
                    onClick={() => handleDeleteItem(index)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Item Form */}
      {showAddItem && (
        <div className="item-form-overlay">
          <div className="item-form">
            <h4 className="item-form-title">
              {editingIndex >= 0 ? 'Edit Item' : 'Add New Item'}
            </h4>
            
            <div className="item-form-grid">
              {/* Material Master */}
              <FormField
                label="Material Master"
                className="item-field-half"
              >
                <select
                  className="unified-form-control"
                  value={newItem.materialMaster}
                  onChange={(e) => handleItemChange('materialMaster', e.target.value)}
                >
                  <option value="">Select Material</option>
                  {dropdownData.materials?.map(material => (
                    <option key={material._id} value={material._id}>
                      {material.description} - {material.code}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Implant Type */}
              <FormField
                label="Implant Type"
                className="item-field-half"
              >
                <select
                  className="unified-form-control"
                  value={newItem.implantType}
                  onChange={(e) => handleItemChange('implantType', e.target.value)}
                >
                  <option value="">Select Implant Type</option>
                  {dropdownData.implantTypes?.map(implant => (
                    <option key={implant._id} value={implant._id}>
                      {implant.name}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Description */}
              <FormField
                label="Description"
                className="item-field-full"
              >
                <input
                  type="text"
                  className="unified-form-control"
                  value={newItem.description}
                  onChange={(e) => handleItemChange('description', e.target.value)}
                  placeholder="Enter item description"
                />
              </FormField>

              {/* Quantity */}
              <FormField
                label="Quantity"
                required
                className="item-field-third"
              >
                <input
                  type="number"
                  className="unified-form-control"
                  value={newItem.quantity}
                  onChange={(e) => handleItemChange('quantity', e.target.value)}
                  min="0"
                  step="1"
                />
              </FormField>

              {/* Unit Price */}
              <FormField
                label="Unit Price (₹)"
                className="item-field-third"
              >
                <input
                  type="number"
                  className="unified-form-control"
                  value={newItem.unitPrice}
                  onChange={(e) => handleItemChange('unitPrice', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </FormField>

              {/* Total Amount */}
              <FormField
                label="Total Amount (₹)"
                className="item-field-third"
              >
                <input
                  type="number"
                  className="unified-form-control"
                  value={newItem.totalAmount}
                  readOnly
                  style={{ backgroundColor: '#f9fafb', color: '#6b7280' }}
                />
              </FormField>

              {/* Notes */}
              <FormField
                label="Notes"
                className="item-field-full"
              >
                <textarea
                  className="unified-form-control"
                  value={newItem.notes}
                  onChange={(e) => handleItemChange('notes', e.target.value)}
                  placeholder="Enter any notes for this item..."
                  rows={2}
                />
              </FormField>
            </div>

            <div className="item-form-actions">
              <button
                type="button"
                className="unified-btn unified-btn-secondary"
                onClick={handleCancelItem}
              >
                Cancel
              </button>
              <button
                type="button"
                className="unified-btn unified-btn-primary"
                onClick={handleSaveItem}
              >
                {editingIndex >= 0 ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentItems.length === 0 && !showAddItem && (
        <div className="empty-items">
          <p>No items added yet.</p>
          {!disabled && (
            <button
              type="button"
              className="unified-btn unified-btn-primary"
              onClick={handleAddItem}
            >
              ➕ Add First Item
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemManagement;
