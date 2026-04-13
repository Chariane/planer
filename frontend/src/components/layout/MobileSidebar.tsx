import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import { X } from 'lucide-react';

export default function MobileSidebar({ onClose }: { onClose: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        exit={{ x: -300 }}
        transition={{ type: 'spring', damping: 25 }}
        className="fixed inset-y-0 left-0 z-50 w-64"
      >
        <div className="relative h-full">
          <Sidebar isOpen={true} />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-1 text-white z-10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </motion.div>
    </>
  );
}
