import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

// Define the props our Modal will accept
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode; // To display the main content
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        {/* The backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              {/* The main modal panel */}
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden bg-white p-6 text-left align-middle shadow-xl transition-all">
                
                {/* --- ICON LOGIC REMOVED --- */}
                {/* The getIcon() function and its container div are completely gone. */}

                <Dialog.Title
                  as="h3"
                  className="text-lg font-bold leading-6 text-gray-900 text-center"
                >
                  {title}
                </Dialog.Title>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 text-center">
                    {children}
                  </p>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex justify-center w-full border border-transparent bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-80 focus:outline-none"
                    onClick={onClose}
                  >
                    OK
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;