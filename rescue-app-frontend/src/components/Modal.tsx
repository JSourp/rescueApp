import React, { ReactNode, useState, useEffect } from 'react';

/*
Default Behavior:
  By setting preventBackdropClickClose = true as the default in the component's props deconstruction,
  any modal that doesn't explicitly pass this prop will now prevent closing on backdrop click.
  Users will have to use the "Escape" key or the "X" icon
  (or a "Cancel"/"Close" button within the modal content that calls onClose).

Overriding for Simple Modals:
  If there are a few simple, non-critical modals
  (like a quick confirmation message that should be easily dismissible by clicking outside),
  you can explicitly allow backdrop click close by passing preventBackdropClickClose={false}:

<Modal onClose={handleSimpleModalClose} preventBackdropClickClose={false}>
    <p>This is a simple notification you can click away.</p>
</Modal>
*/

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  preventBackdropClickClose?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  children,
  onClose,
  preventBackdropClickClose = true // Default to true (prevent backdrop close)
}) => {
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

  // Conditional handler for overlay click
  const handleOverlayClick = () => {
    if (!preventBackdropClickClose) { // Only close if not prevented
      onClose();
    }
    // If preventBackdropClickClose is true, clicking the overlay does nothing
  };

  // Prevent clicks inside the modal content from closing it
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-75 flex justify-center items-center z-50 p-4 transition-opacity duration-200 ease-in-out"
      onClick={handleOverlayClick} // Handle close modal or not (default is not to) if overlay is clicked
      role="dialog"
      aria-modal="true">
      {/* Modal Content Box */}
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl relative w-full max-w-lg overflow-hidden"
        onClick={handleContentClick}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-2xl z-10"
          aria-label="Close modal">
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
