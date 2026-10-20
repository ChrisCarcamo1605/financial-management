import type { categories as es } from '../es/categories';

export const categories: typeof es = {
  gridEmpty: "You don't have categories of this type yet. Create them in Settings.",
  form: {
    editTitle: 'Edit category',
    newTitle: 'New category',
    submitEdit: 'Save changes',
    submitNew: 'Create category',
    updated: 'Category updated',
    created: 'Category created',
    deleted: 'Category deleted',
    deleteDescription: "It can only be deleted if it has no budgets. This can't be undone.",
    preview: 'Preview',
    typeLabel: 'Category type',
    expense: 'Expense',
    income: 'Income',
    namePlaceholder: 'E.g. Groceries',
    color: 'Color',
    colorLabel: 'Category color',
    icon: 'Icon',
    colorRequired: 'Pick a color',
    iconRequired: 'Pick an icon',
  },
};
