import React from 'react';
import { DvOwnerBadge, DvOwnerBadgeProps, isProjectOwnerUser } from './DvOwnerBadge';

export interface OwnerBadgeProps extends DvOwnerBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * OwnerBadge
 * Stylized gold-on-blue half-moon crescent containing the letters 'DV'.
 * Identifies the official Tolkflow Project Owner.
 */
export const OwnerBadge: React.FC<OwnerBadgeProps> = (props) => {
  return <DvOwnerBadge {...props} />;
};

export { isProjectOwnerUser };
export default OwnerBadge;
