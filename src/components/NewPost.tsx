import { actions } from "astro:actions";
import { type InfiniteData, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Select, {
  type GroupBase,
  type Props as ReactSelectProps,
} from "react-select";
import { usePostMetadata } from "@/hooks/usePostMetadata";
import { queryClient } from "@/queryClient";
import { getUser } from "@/userStore";
import type { PostData } from "./Feed";

type SelectOption = { value: number; label: string };

type StyledSelectProps<IsMulti extends boolean> = ReactSelectProps<
  SelectOption,
  IsMulti,
  GroupBase<SelectOption>
> & {
  truncateMultiValueLabel?: boolean;
};

function StyledSelect<IsMulti extends boolean = false>({
  truncateMultiValueLabel = false,
  ...props
}: StyledSelectProps<IsMulti>) {
  return (
    <Select<SelectOption, IsMulti, GroupBase<SelectOption>>
      unstyled
      className="w-full"
      classNames={{
        container: () => "min-w-0 w-full",
        control: () =>
          "min-h-[38px] min-w-0 w-full max-w-full rounded border border-gray-300 bg-gray-50 px-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
        valueContainer: () =>
          "flex min-w-0 w-full flex-wrap gap-1 overflow-hidden py-1",
        input: () => "text-gray-900 dark:text-gray-100",
        placeholder: () => "text-gray-500 dark:text-gray-400",
        menu: () =>
          "mt-1 w-full rounded border border-gray-300 bg-gray-50 py-1 shadow-md dark:border-gray-600 dark:bg-gray-800",
        menuList: () => "max-h-52 overflow-auto",
        option: ({ isFocused, isSelected }) =>
          [
            "px-3 py-2 cursor-pointer",
            isSelected
              ? "bg-gray-300 dark:bg-gray-600"
              : isFocused
                ? "bg-gray-200 dark:bg-gray-700"
                : "bg-transparent",
            "text-gray-900 dark:text-gray-100",
          ].join(" "),
        multiValue: () =>
          "max-w-full rounded bg-gray-200 pl-1 dark:bg-gray-700",
        multiValueLabel: () =>
          truncateMultiValueLabel
            ? "max-w-[20ch] truncate text-gray-900 dark:text-gray-100"
            : "text-gray-900 dark:text-gray-100",
        multiValueRemove: () =>
          "rounded px-1 ml-2 hover:bg-gray-300 dark:hover:bg-gray-600",
        clearIndicator: () =>
          "cursor-pointer px-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100",
        dropdownIndicator: () =>
          "cursor-pointer px-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100",
        indicatorSeparator: () => "mx-1 w-px bg-gray-300 dark:bg-gray-600",
      }}
      {...props}
    />
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="my-2 flex w-full items-center gap-2">
      <h2 className="shrink-0 text-lg font-semibold text-gray-700 dark:text-gray-200">
        {title}
      </h2>
      <hr className="border-0.5 h-px w-full border-gray-300 bg-gray-300 dark:bg-gray-600" />
    </div>
  );
}

interface NewPostProps {
  onPostCreated?: () => void;
}

export default function NewPost({ onPostCreated }: NewPostProps) {
  const user = getUser();

  const { postTypes, tags, isLoading, isError } = usePostMetadata();

  const { mutate, isPending } = useMutation(
    {
      mutationFn: actions.createPost.orThrow,
      onMutate: async (newPost) => {
        await queryClient.cancelQueries({ queryKey: ["posts"] });

        const previousPosts = queryClient.getQueryData(["posts"]);
        const now = new Date();
        const selectedPostType = postTypes.find(
          (type) => type.id === newPost.postType,
        );

        const post: PostData = {
          author: user?.name || "Unknown",
          category: selectedPostType?.name || "Sem categoria",
          content: newPost.content,
          zipCode: newPost.informAddress ? (newPost.zipCode ?? null) : null,
          city: newPost.informAddress ? (newPost.city ?? null) : null,
          district: newPost.informAddress ? (newPost.district ?? null) : null,
          street: newPost.informAddress ? (newPost.street ?? null) : null,
          number: newPost.informAddress ? (newPost.number ?? null) : null,
          tags: selectedTags.map((tag) => tag.label),
          id: now.getTime(),
          likes: 0,
          liked: false,
          title: newPost.title,
          createdAt: now,
          updatedAt: now,
          ghost: true,
        };

        // optimistically add the post to the first page
        queryClient.setQueryData(
          ["posts"],
          (
            old: InfiniteData<{ posts: PostData[]; nextCursor?: Date | null }>,
          ) => {
            if (!old) {
              return {
                pages: [{ posts: [post], nextCursor: null }],
                pageParams: [null],
              };
            }

            const updatedFirstPagePosts = [
              post,
              ...(old.pages[0]?.posts ?? []),
            ];

            return {
              ...old,
              pages: [
                {
                  ...(old.pages[0] ?? { nextCursor: null }),
                  posts: updatedFirstPagePosts,
                },
                ...(old?.pages?.slice(1) ?? []),
              ],
              pageParams: old.pageParams ?? [null],
            };
          },
        );

        return { previousPosts, newPost: post };
      },
      onSuccess: () => {
        setTitle("");
        setContent("");
        setPostType(null);
        setSelectedTags([]);
        setInformAddress(false);
        setZipCode("");
        setCity("");
        setDistrict("");
        setStreet("");
        setNumber("");
        onPostCreated?.();
      },
      onError: (_, _1, onMutateResult) => {
        if (onMutateResult?.previousPosts) {
          queryClient.setQueryData(
            ["posts"],
            () => onMutateResult?.previousPosts,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      },
    },
    queryClient,
  );

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<
    { value: number; label: string }[]
  >([]);
  const [informAddress, setInformAddress] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");

  return (
    <form
      className={`flex w-full max-w-lg flex-col items-center gap-2 ${isPending ? "opacity-50" : ""}`}
      aria-disabled={isPending}
      onSubmit={(e) => {
        e.preventDefault();

        const hasInvalidAddress =
          informAddress &&
          (!zipCode.trim() ||
            !city.trim() ||
            !district.trim() ||
            !street.trim() ||
            !number.trim());

        if (
          isPending ||
          !postType ||
          !title.trim() ||
          !content.trim() ||
          hasInvalidAddress
        )
          return;
        mutate({
          title: title.trim(),
          content: content.trim(),
          postType,
          tagIds: selectedTags.map((tag) => tag.value),
          informAddress,
          zipCode: zipCode.trim() || undefined,
          city: city.trim() || undefined,
          district: district.trim() || undefined,
          street: street.trim() || undefined,
          number: number.trim() || undefined,
        });
      }}
    >
      <SectionHeader title="Informações Gerais" />

      <StyledSelect
        isDisabled={isLoading || isError || isPending}
        name="postType"
        placeholder="Tipo de Postagem"
        value={
          postTypes
            .map((postType) => ({ value: postType.id, label: postType.name }))
            .find((option) => option.value === postType) ?? null
        }
        onChange={(option) => setPostType(option?.value ?? null)}
        options={postTypes.map((postType) => ({
          value: postType.id,
          label: postType.name,
        }))}
      />

      <input
        type="text"
        name="title"
        placeholder="Título"
        autoComplete="off"
        disabled={isPending}
        value={title}
        className="min-h-9.5 w-full rounded border border-gray-300 bg-gray-50 px-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        name="content"
        placeholder="Conteúdo"
        autoComplete="off"
        disabled={isPending}
        value={content}
        className="min-h-9.5 w-full rounded border border-gray-300 bg-gray-50 px-2 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        onChange={(e) => setContent(e.target.value)}
      />

      <StyledSelect<true>
        isMulti
        isDisabled={isLoading || isError || isPending}
        name="tags"
        placeholder="Tags da postagem (opcional)"
        value={selectedTags}
        onChange={(options) => setSelectedTags(Array.from(options))}
        options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
        truncateMultiValueLabel
      />

      <SectionHeader title="Local" />

      <StyledSelect
        name="informAddress"
        isDisabled={isPending}
        value={
          informAddress
            ? { value: 1, label: "Informar Endereço: Sim" }
            : { value: 0, label: "Informar Endereço: Não" }
        }
        onChange={(option) => setInformAddress(option?.value === 1)}
        options={[
          { value: 1, label: "Informar Endereço: Sim" },
          { value: 0, label: "Informar Endereço: Não" },
        ]}
      />

      {informAddress && (
        <>
          <input
            type="text"
            name="zipCode"
            placeholder="Cep"
            autoComplete="postal-code"
            required={informAddress}
            disabled={isPending}
            value={zipCode}
            className="min-h-9.5 w-full rounded border border-gray-300 bg-gray-50 px-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            onChange={(e) => setZipCode(e.target.value)}
          />

          <input
            type="text"
            name="city"
            placeholder="Cidade"
            autoComplete="address-level2"
            required={informAddress}
            disabled={isPending}
            value={city}
            className="min-h-9.5 w-full rounded border border-gray-300 bg-gray-50 px-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            onChange={(e) => setCity(e.target.value)}
          />

          <input
            type="text"
            name="district"
            placeholder="Bairro"
            autoComplete="address-level3"
            required={informAddress}
            disabled={isPending}
            value={district}
            className="min-h-9.5 w-full rounded border border-gray-300 bg-gray-50 px-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            onChange={(e) => setDistrict(e.target.value)}
          />

          <input
            type="text"
            name="street"
            placeholder="Rua"
            autoComplete="address-line1"
            required={informAddress}
            disabled={isPending}
            value={street}
            className="min-h-9.5 w-full rounded border border-gray-300 bg-gray-50 px-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            onChange={(e) => setStreet(e.target.value)}
          />

          <input
            type="text"
            name="number"
            placeholder="Numero"
            autoComplete="off"
            required={informAddress}
            disabled={isPending}
            value={number}
            className="min-h-9.5 w-full rounded border border-gray-300 bg-gray-50 px-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            onChange={(e) => setNumber(e.target.value)}
          />
        </>
      )}

      <button
        type="submit"
        disabled={
          isPending ||
          !postType ||
          !title.trim() ||
          !content.trim() ||
          (informAddress &&
            (!zipCode.trim() ||
              !city.trim() ||
              !district.trim() ||
              !street.trim() ||
              !number.trim()))
        }
        className={`w-fit cursor-pointer rounded bg-gray-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700`}
      >
        Criar Postagem
      </button>
    </form>
  );
}
