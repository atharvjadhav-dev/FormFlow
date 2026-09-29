'use client';

import { useReducer, useCallback } from 'react';
import type { FormField, FieldType } from '@/db/schema';
import { createDefaultField } from '@/lib/field-types';

export interface BuilderState {
  past: FormField[][];
  fields: FormField[];
  future: FormField[][];
  selectedFieldId: string | null;
  lastActionTime?: number;
  lastActionType?: string;
  lastActionTargetId?: string;
}

export type BuilderAction =
  | { type: 'ADD_FIELD'; fieldType: FieldType; atIndex: number }
  | { type: 'REMOVE_FIELD'; id: string }
  | { type: 'DUPLICATE_FIELD'; id: string }
  | { type: 'MOVE_FIELD'; id: string; delta: number }
  | { type: 'UPDATE_FIELD'; id: string; patch: Partial<FormField> }
  | { type: 'REORDER'; fromIndex: number; toIndex: number }
  | { type: 'SELECT'; id: string | null }
  | { type: 'RESTORE_FIELDS'; fields: FormField[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export function pushHistory(state: BuilderState): { past: FormField[][]; future: FormField[][] } {
  return {
    past: [...state.past.slice(-49), state.fields],
    future: [],
  };
}

export function reducer(state: BuilderState, action: BuilderAction): BuilderState {
  const now = Date.now();

  switch (action.type) {
    case 'ADD_FIELD': {
      const field = createDefaultField(action.fieldType);
      const fields = [...state.fields];
      fields.splice(action.atIndex, 0, field);
      const { past, future } = pushHistory(state);
      return {
        ...state,
        past,
        future,
        fields,
        selectedFieldId: field.id,
        lastActionTime: now,
        lastActionType: 'ADD_FIELD',
      };
    }

    case 'REMOVE_FIELD': {
      const fields = state.fields.filter((f) => f.id !== action.id);
      const { past, future } = pushHistory(state);
      return {
        ...state,
        past,
        future,
        fields,
        selectedFieldId: state.selectedFieldId === action.id ? null : state.selectedFieldId,
        lastActionTime: now,
        lastActionType: 'REMOVE_FIELD',
      };
    }

    case 'DUPLICATE_FIELD': {
      const index = state.fields.findIndex((f) => f.id === action.id);
      if (index === -1) return state;
      const target = state.fields[index];
      const newField: FormField = {
        ...JSON.parse(JSON.stringify(target)),
        id: crypto.randomUUID(),
        label: `${target.label} (copy)`,
      };
      const fields = [...state.fields];
      fields.splice(index + 1, 0, newField);
      const { past, future } = pushHistory(state);
      return {
        ...state,
        past,
        future,
        fields,
        selectedFieldId: newField.id,
        lastActionTime: now,
        lastActionType: 'DUPLICATE_FIELD',
      };
    }

    case 'MOVE_FIELD': {
      const index = state.fields.findIndex((f) => f.id === action.id);
      if (index === -1) return state;
      const newIndex = Math.max(0, Math.min(state.fields.length - 1, index + action.delta));
      if (newIndex === index) return state;
      const fields = [...state.fields];
      const [moved] = fields.splice(index, 1);
      fields.splice(newIndex, 0, moved);
      const { past, future } = pushHistory(state);
      return {
        ...state,
        past,
        future,
        fields,
        selectedFieldId: moved.id,
        lastActionTime: now,
        lastActionType: 'MOVE_FIELD',
      };
    }

    case 'UPDATE_FIELD': {
      // Group rapid property updates (within 1000ms on same field) so typing doesn't create 1 frame per character
      const isGrouped =
        state.lastActionType === 'UPDATE_FIELD' &&
        state.lastActionTargetId === action.id &&
        state.lastActionTime &&
        now - state.lastActionTime < 1000;

      const past = isGrouped ? state.past : [...state.past.slice(-49), state.fields];
      const future = isGrouped ? state.future : [];

      return {
        ...state,
        past,
        future,
        fields: state.fields.map((f) => (f.id === action.id ? { ...f, ...action.patch } : f)),
        lastActionTime: now,
        lastActionType: 'UPDATE_FIELD',
        lastActionTargetId: action.id,
      };
    }

    case 'REORDER': {
      const fields = [...state.fields];
      const [moved] = fields.splice(action.fromIndex, 1);
      fields.splice(action.toIndex, 0, moved);
      const { past, future } = pushHistory(state);
      return {
        ...state,
        past,
        future,
        fields,
        lastActionTime: now,
        lastActionType: 'REORDER',
      };
    }

    case 'SELECT':
      return { ...state, selectedFieldId: action.id };

    case 'RESTORE_FIELDS': {
      const { past, future } = pushHistory(state);
      return {
        ...state,
        past,
        future,
        fields: action.fields,
        selectedFieldId: null,
        lastActionTime: now,
        lastActionType: 'RESTORE_FIELDS',
      };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        ...state,
        past: newPast,
        future: [state.fields, ...state.future],
        fields: previous,
        selectedFieldId: previous.find((f) => f.id === state.selectedFieldId)
          ? state.selectedFieldId
          : (previous[0]?.id ?? null),
        lastActionTime: undefined,
        lastActionType: undefined,
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        ...state,
        past: [...state.past.slice(-49), state.fields],
        future: newFuture,
        fields: next,
        selectedFieldId: next.find((f) => f.id === state.selectedFieldId)
          ? state.selectedFieldId
          : (next[0]?.id ?? null),
        lastActionTime: undefined,
        lastActionType: undefined,
      };
    }

    default:
      return state;
  }
}

export function useBuilder(initialFields: FormField[]) {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    fields: initialFields,
    future: [],
    selectedFieldId: null,
  });

  const addField = useCallback((fieldType: FieldType, atIndex?: number) => {
    dispatch({ type: 'ADD_FIELD', fieldType, atIndex: atIndex ?? state.fields.length });
  }, [state.fields.length]);

  const removeField = useCallback((id: string) => dispatch({ type: 'REMOVE_FIELD', id }), []);
  const duplicateField = useCallback((id: string) => dispatch({ type: 'DUPLICATE_FIELD', id }), []);
  const moveField = useCallback((id: string, delta: number) => dispatch({ type: 'MOVE_FIELD', id, delta }), []);

  const updateField = useCallback(
    (id: string, patch: Partial<FormField>) => dispatch({ type: 'UPDATE_FIELD', id, patch }),
    [],
  );
  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => dispatch({ type: 'REORDER', fromIndex, toIndex }),
    [],
  );
  const select = useCallback((id: string | null) => dispatch({ type: 'SELECT', id }), []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const restoreFields = useCallback(
    (fields: FormField[]) => dispatch({ type: 'RESTORE_FIELDS', fields }),
    [],
  );

  return {
    fields: state.fields,
    selectedFieldId: state.selectedFieldId,
    selectedField: state.fields.find((f) => f.id === state.selectedFieldId) ?? null,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    addField,
    removeField,
    duplicateField,
    moveField,
    updateField,
    reorder,
    select,
    undo,
    redo,
    restoreFields,
  };
}

