import { useContext } from 'react';
import { FirebaseContext } from '../provider';

export function useStorage() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useStorage must be used within a FirebaseProvider');
  }
  return context.storage;
}
