// src/components/Modal.tsx
import React, { ReactNode, useEffect } from 'react';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  // Close modal on escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Prevent clicks inside the modal content from closing it
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-75 flex justify-center items-center z-50 p-4 transition-opacity duration-200 ease-in-out"
      onClick={onClose} // Close modal if overlay is clicked
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Content Box */}
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl relative w-full max-w-lg overflow-hidden"
        onClick={handleContentClick} // Stop propagation
      >
        {/* Add a close button inside */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-2xl z-10"
          aria-label="Close modal"
         >
           &times;
         </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;