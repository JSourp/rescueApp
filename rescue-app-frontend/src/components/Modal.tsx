import { ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
}

const Modal = ({ children, onClose }: ModalProps) => (
   <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
     <div className="bg-white p-0 rounded-lg shadow-xl relative max-w-lg w-full mx-4">
       {/* <button onClick={onClose} className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl">&times;</button> */}
       {children}
     </div>
   </div>
);

export default Modal;