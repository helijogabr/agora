import { actions } from "astro:actions";
import { useMutation } from "@tanstack/react-query";
import debounce from "lodash/debounce";
import { memo, useMemo, useState } from "react";
import { queryClient } from "@/query_client";
import type { TodoItem } from "./Todo";

type Props = {
  oldTempIds: Map<number, number>;
} & TodoItem;

function TodoElement({ oldTempIds, ...item }: Props) {
  const [newTitle, setNewTitle] = useState(item.title ?? "");

  if (import.meta.env.DEV) {
    console.log(item);
  }

  const modifyTodo = useMutation(
    {
      mutationFn: actions.changeTodoTitle.orThrow,
      onMutate: async (input, context) => {
        await context.client.cancelQueries({ queryKey: ["todos"] });

        const previousList = context.client.getQueryData(["todos"]);

        // add only non-undefined fields of input
        context.client.setQueryData(
          ["todos"],
          (old: TodoItem[] | undefined) =>
            old?.map((t) =>
              t.id === input.id
                ? {
                    ...t,
                    ...input,
                    ghostMod: true,
                  }
                : t,
            ) ?? [],
        );

        return { previousList, modifiedId: input.id };
      },
      onSuccess: async (_1, modified, onMutateResult, context) => {
        const id = onMutateResult.modifiedId;

        context.client.setQueryData(
          ["todos"],
          (old: TodoItem[] | undefined) =>
            old?.map((t) =>
              t.id === id
                ? {
                    ...t,
                    title: modified.title,
                    ghostMod: false,
                  }
                : t,
            ) ?? [],
        );
      },
      onError: (error, _, onMutateResult, context) => {
        console.error("Failed to modify todo:", error);

        if (onMutateResult) {
          context.client.setQueryData(["todos"], onMutateResult.previousList);
        }

        context.client.invalidateQueries({ queryKey: ["todos"] });
      },
    },
    queryClient,
  );

  const toggleTodo = useMutation(
    {
      mutationFn: actions.toggleTodo.orThrow,
      onMutate: async (input, context) => {
        await context.client.cancelQueries({ queryKey: ["todos"] });
        const id = input.id;

        const previousList = context.client.getQueryData(["todos"]);

        context.client.setQueryData(
          ["todos"],
          (old: TodoItem[] | undefined) =>
            old?.map((t) =>
              t.id === id
                ? {
                    ...t,
                    completed: !t.completed,
                    ghostCheck: true,
                  }
                : t,
            ) ?? [],
        );

        return { previousList, toggledId: id };
      },
      onSuccess: async (_1, _2, onMutateResult, context) => {
        const id = onMutateResult.toggledId;

        context.client.setQueryData(["todos"], (old: TodoItem[] | undefined) =>
          old?.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ghostCheck: false,
                }
              : t,
          ),
        );
      },
      onError: (error, _, onMutateResult, context) => {
        if (onMutateResult) {
          context.client.setQueryData(["todos"], onMutateResult.previousList);
        }

        console.error("Failed to toggle todo:", error);
        context.client.invalidateQueries({ queryKey: ["todos"] });
      },
    },
    queryClient,
  );

  const deleteTodo = useMutation(
    {
      mutationFn: actions.deleteTodo.orThrow,
      onMutate: async (input, context) => {
        await context.client.cancelQueries({ queryKey: ["todos"] });

        const id = input.id;

        const previousList = context.client.getQueryData(["todos"]);

        context.client.setQueryData(
          ["todos"],
          (old: TodoItem[] | undefined) =>
            old?.map((t) => (t.id === id ? { ...t, ghostDel: true } : t)) ?? [],
        );

        return { previousList, deletedId: id };
      },
      onSuccess: (_1, input, _2, context) => {
        const id = input.id;
        oldTempIds.delete(id);

        context.client.setQueryData(
          ["todos"],
          (old: TodoItem[] | undefined) =>
            old?.filter((t) => t.id !== id) ?? [],
        );
      },
      onError: (error, _, onMutateResult, context) => {
        console.error("Failed to delete todo:", error);

        if (onMutateResult) {
          context.client.setQueryData(["todos"], onMutateResult.previousList);
        }

        context.client.invalidateQueries({ queryKey: ["todos"] });
      },
    },
    queryClient,
  );

  const debouncedModify = useMemo(
    () =>
      debounce((id: number, title: string) => {
        modifyTodo.mutate({ id, title });
      }, 500),
    [modifyTodo.mutate],
  );

  return (
    <li
      className={`flex flex-row gap-1 ${item.ghostAdd ? "opacity-50" : ""} ${item.ghostDel ? "line-through opacity-30" : ""}`}
    >
      <input
        type="checkbox"
        checked={!!item.completed}
        onChange={() => {
          if (item.ghostDel) return;
          toggleTodo.mutate({ id: item.id });
        }}
        disabled={!!item.ghostDel || !!item.ghostAdd || !!item.ghostCheck}
        className={`cursor-pointer rounded border-gray-300 disabled:cursor-not-allowed ${item.ghostCheck ? "opacity-50" : ""}`}
      />

      <button
        type="button"
        disabled={!!item.ghostDel || !!item.ghostAdd}
        className={`cursor-pointer rounded border border-gray-300 px-1 disabled:cursor-not-allowed ${item.completed ? "font-bold text-gray-700" : "text-gray-500"}`}
        onClick={() => deleteTodo.mutate({ id: item.id })}
      >
        D
      </button>

      <input
        type="text"
        name="title"
        value={newTitle ?? ""}
        disabled={item.ghostDel || item.ghostAdd}
        className={`${item.ghostMod ? "opacity-50" : ""}`}
        onChange={(e) => {
          setNewTitle(e.target.value);

          if (item.ghostDel || item.ghostAdd) return;

          const title = e.target.value.trim();
          if (!title) return;
          if (title === item.title) return;

          debouncedModify(item.id, title);
        }}
      />

      {import.meta.env.DEV && item.tempId && (
        <span className="text-sm text-gray-400"> (tempId: {item.tempId})</span>
      )}
    </li>
  );
}

export default memo(TodoElement);
