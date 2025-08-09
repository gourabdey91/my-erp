import { useState, useEffect, useRef } from 'react';

export const useDropdownMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const dropdownRef = useRef(null);

  const toggleMenu = (id = null) => {
    if (id !== null) {
      setOpenMenuId(openMenuId === id ? null : id);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
    setOpenMenuId(null);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeMenu();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    if (isOpen || openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, openMenuId]);

  return {
    isOpen: openMenuId !== null || isOpen,
    openMenuId,
    dropdownRef,
    toggleMenu,
    closeMenu
  };
};
