import { privateAPi } from ".";

export const expensesApi = privateAPi.injectEndpoints({
  endpoints: (builder) => ({
    getExpenseSummary: builder.query({
      query: (params) => ({
        url: "/manager/expenses/summary/",
        method: "GET",
        params,
      }),
      providesTags: ["ExpensesSummary"],
    }),

    getExpenseBreakdown: builder.query({
      query: (params) => ({
        url: "/manager/expenses/breakdown/",
        method: "GET",
        params,
      }),
      providesTags: ["ExpensesBreakdown"],
    }),

    getExpenses: builder.query({
      query: (params) => ({
        url: "/manager/expenses/",
        method: "GET",
        params,
      }),
      providesTags: ["Expenses"],
    }),

    getExpenseDetail: builder.query({
      query: ({ id, params }) => ({
        url: `/manager/expenses/${id}/`,
        method: "GET",
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: "Expenses", id }],
    }),

    createExpense: builder.mutation({
      query: (body) => ({
        url: "/manager/expenses/",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Expenses",
        "ExpensesSummary",
        "ExpensesBreakdown",
        "ExpenseCategories",
      ],
    }),

    updateExpense: builder.mutation({
      query: ({ id, body }) => ({
        url: `/manager/expenses/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        "Expenses",
        "ExpensesSummary",
        "ExpensesBreakdown",
      ],
    }),

    voidExpense: builder.mutation({
      query: ({ id, void_reason }) => ({
        url: `/manager/expenses/${id}/void/`,
        method: "POST",
        body: { void_reason },
      }),
      invalidatesTags: [
        "Expenses",
        "ExpensesSummary",
        "ExpensesBreakdown",
      ],
    }),

    getExpenseCategories: builder.query({
      query: (params) => ({
        url: "/manager/expenses/categories/",
        method: "GET",
        params,
      }),
      providesTags: ["ExpenseCategories"],
    }),

    addExpenseCategory: builder.mutation({
      query: (body) => ({
        url: "/manager/expenses/categories/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ExpenseCategories"],
    }),

    updateExpenseCategory: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/manager/expenses/categories/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        "ExpenseCategories",
        "Expenses",
        "ExpensesSummary",
        "ExpensesBreakdown",
      ],
    }),

    deleteExpenseCategory: builder.mutation({
      query: (id) => ({
        url: `/manager/expenses/categories/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "ExpenseCategories",
        "Expenses",
        "ExpensesSummary",
        "ExpensesBreakdown",
      ],
    }),
  }),
});

export const {
  useGetExpenseSummaryQuery,
  useGetExpenseBreakdownQuery,
  useGetExpensesQuery,
  useGetExpenseDetailQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useVoidExpenseMutation,
  useGetExpenseCategoriesQuery,
  useAddExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
} = expensesApi;
