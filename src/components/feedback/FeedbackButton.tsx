import React, { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { motion } from "motion/react";
import { FeedbackModal } from "./FeedbackModal";

interface FeedbackButtonProps {
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  isOpen: externalIsOpen,
  onOpen,
  onClose: externalOnClose,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isModalOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleOpen = () => {
    if (onOpen) {
      onOpen();
    } else {
      setInternalIsOpen(true);
    }
  };

  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  return (
    <FeedbackModal
      isOpen={isModalOpen}
      onClose={handleClose}
    />
  );
};
