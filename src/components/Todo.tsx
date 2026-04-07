import { actions } from "astro:actions";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { queryClient } from "@/query_client";
import TodoElement from "./TodoElement";

export type TodoItem = {
  id: number;
  title: string;
  completed?: boolean;
  tempId?: number; // for optimistic additions
  ghostAdd?: boolean; // for optimistic additions
  ghostDel?: boolean; // for optimistic deletions
  ghostMod?: boolean; // for optimistic modifications
  ghostCheck?: boolean; // for optimistic toggles
};

export function isGhost(item: TodoItem) {
  return item.ghostAdd || item.ghostDel || item.ghostMod;
}

export default function Todo({
  todos,
}: {
  todos: { id: number; title: string; completed: boolean }[];
}) {
  const [newTodo, setNewTodo] = useState("");

  const oldTempIds = useRef(new Map<number, number>()).current;

  const { data, isFetching } = useQuery(
    {
      queryKey: ["todos"],
      queryFn: async () => {
        const todos: TodoItem[] = await actions.getTodos.orThrow();

        todos.forEach((t) => {
          if (t.tempId) return;
          const tempId = oldTempIds.get(t.id);
          if (tempId) t.tempId = tempId;
        });

        return todos;
      },
      initialData: todos as TodoItem[],
      staleTime: 5 * 60 * 1000, // 5 min
    },
    queryClient,
  );

  const addTodo = useMutation(
    {
      mutationFn: actions.addTodo.orThrow,
      async onMutate(input, context) {
        await context.client.cancelQueries({ queryKey: ["todos"] });

        // optimistically add the new todo to the list with a temporary id
        const tempId = Date.now();

        const optimisticItem = {
          title: input.title,
          tempId,
          completed: false,
          ghostAdd: true
        };

        const previousList = context.client.getQueryData(["todos"]);

        context.client.setQueryData(
          ["todos"],
          (old: TodoItem[] | undefined) => [...(old || []), optimisticItem],
        );

        return { previousList, optimisticItem };
      },
      onSuccess: (result, _, onMutateResult, context) => {
        const ghost = onMutateResult.optimisticItem;

        const newItem = {
          id: result.id,
          title: ghost.title,
          completed: ghost.completed,
          tempId: ghost.tempId,
        };

        oldTempIds.set(newItem.id, newItem.tempId);

        context.client.setQueryData(
          ["todos"],
          (old: TodoItem[] | undefined) =>
            old?.map((t) => (t.tempId === ghost.tempId ? newItem : t)) ?? [
              newItem,
            ],
        );
      },
      onError: (error, _, onMutateResult, context) => {
        console.error("Failed to add todo:", error);
        const ghost = onMutateResult?.optimisticItem;

        if (ghost) {
          context.client.setQueryData(["todos"], onMutateResult.previousList);
        }

        context.client.invalidateQueries({ queryKey: ["todos"] });
      },
    },
    queryClient,
  );

  const todoList = useMemo(() => {
    return data.toSorted((a, b) => {
      if (a.completed === b.completed) {
        return Number(b.tempId ?? b.id) - Number(a.tempId ?? a.id);
      }

      return a.completed ? 1 : -1;
    });
  }, [data]);

  const [animation] = useAutoAnimate();

  const isSyncing = isFetching || addTodo.isPending;

  return (
    <div className="">
      <div className="mb-2 flex flex-row justify-between">
        <h1 className="text-2xl">Todo List</h1>
        <button
          type="button"
          disabled={isSyncing}
          className="cursor-pointer rounded border border-gray-300 bg-gray-100 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["todos"] })}
        >
          Refresh
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          newTodo.trim() && addTodo.mutate({ title: newTodo.trim() });
          setNewTodo("");
        }}
      >
        <input
          type="text"
          onChange={(e) => setNewTodo(e.target.value)}
          value={newTodo}
          className="mb-5 rounded border border-gray-300"
        />
        <button
          type="submit"
          className="ml-1 cursor-pointer rounded border border-gray-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add a new Todo
        </button>
      </form>

      <ul
        className={`flex flex-col gap-2 ${isFetching ? "opacity-50" : ""}`}
        ref={animation}
      >
        {todoList.map((item) => (
          <TodoElement
            key={item.tempId ?? item.id}
            oldTempIds={oldTempIds}
            {...item}
          />
        ))}
      </ul>
    </div>
  );
}
