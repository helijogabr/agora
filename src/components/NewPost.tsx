import { actions } from "astro:actions";
import { type InfiniteData, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import Select, {
  type GroupBase,
  type Props as ReactSelectProps,
} from "react-select";
import { usePostMetadata } from "@/hooks/usePostMetadata";
import {
  POST_ATTACHMENT_ACCEPT,
  validateAttachmentDescriptors,
} from "@/modules/posts/domain/attachment-policy";
import { AttachmentValidationError } from "@/modules/posts/domain/post-errors";
import { queryClient } from "@/queryClient";
import { getUser } from "@/userStore";
import type { PostData } from "./Feed";

type SelectOption = { value: number; label: string };

type NewPostMutationInput = {
  title: string;
  content: string;
  postType: number;
  tagIds: number[];
  informAddress: boolean;
  zipCode?: string | undefined;
  city?: string | undefined;
  district?: string | undefined;
  street?: string | undefined;
  number?: string | undefined;
  shareLocation: boolean;
  latitude?: number | undefined;
  longitude?: number | undefined;
  attachments: File[];
};

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
      mutationFn: (newPost: NewPostMutationInput) =>
        actions.createPost.orThrow(createPostFormData(newPost)),
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
          latitude: newPost.shareLocation ? (newPost.latitude ?? null) : null,
          longitude: newPost.shareLocation
            ? (newPost.longitude ?? null)
            : null,
          tags: selectedTags.map((tag) => tag.label),
          id: now.getTime(),
          likes: 0,
          liked: false,
          title: newPost.title,
          createdAt: now,
          updatedAt: now,
          images: [],
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
        setSelectedFiles([]);
        setAttachmentErrors([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setInformAddress(false);
        setZipCode("");
        setCity("");
        setDistrict("");
        setStreet("");
        setNumber("");
        setShareLocation(false);
        setCoords(null);
        setLocationError(null);
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shareLocation, setShareLocation] = useState(false);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Default the checkbox to checked only when geolocation permission is
  // already granted, so we never trigger a fresh permission prompt on mount.
  useEffect(() => {
    if (!navigator.permissions?.query) return;

    let cancelled = false;

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (!cancelled && status.state === "granted") {
          setShareLocation(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!shareLocation || coords || !navigator.geolocation) return;

    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setLocationError(
          "Não foi possível obter sua localização. Verifique as permissões do navegador.",
        );
        setShareLocation(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }, [shareLocation, coords]);

  function updateSelectedFiles(files: File[]) {
    try {
      validateAttachmentDescriptors(files.map(fileToAttachmentDescriptor));
      setSelectedFiles(files);
      setAttachmentErrors([]);
    } catch (error) {
      if (error instanceof AttachmentValidationError) {
        setSelectedFiles([]);
        setAttachmentErrors(error.issues);
      } else {
        setSelectedFiles([]);
        setAttachmentErrors(["Não foi possível validar os anexos."]);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

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

        const isLocationPending = shareLocation && !coords;

        if (
          isPending ||
          !postType ||
          !title.trim() ||
          !content.trim() ||
          hasInvalidAddress ||
          isLocationPending ||
          attachmentErrors.length > 0
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
          shareLocation,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          attachments: selectedFiles,
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

      <SectionHeader title="Anexos" />

      <label
        htmlFor="postAttachments"
        className="w-full text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        Anexos (opcional)
      </label>

      <input
        ref={fileInputRef}
        id="postAttachments"
        type="file"
        name="attachments"
        multiple
        accept={POST_ATTACHMENT_ACCEPT}
        disabled={isPending}
        className="min-h-9.5 w-full rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-900 file:mr-3 file:rounded file:border-0 file:bg-gray-200 file:px-2 file:py-1 file:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:file:bg-gray-700 dark:file:text-gray-100"
        onChange={(event) => {
          updateSelectedFiles(Array.from(event.currentTarget.files ?? []));
        }}
      />

      {attachmentErrors.length > 0 && (
        <ul className="w-full list-disc pl-5 text-sm text-red-700 dark:text-red-300">
          {attachmentErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {selectedFiles.length > 0 && (
        <ul className="flex w-full flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
          {selectedFiles.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex min-h-9 items-center justify-between gap-2 rounded border border-gray-300 bg-gray-50 px-2 dark:border-gray-600 dark:bg-gray-800"
            >
              <span className="min-w-0 truncate">
                {file.name} ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                disabled={isPending}
                className="shrink-0 cursor-pointer rounded bg-gray-200 px-2 py-1 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200"
                onClick={() => {
                  const nextFiles = selectedFiles.filter(
                    (_, fileIndex) => fileIndex !== index,
                  );
                  updateSelectedFiles(nextFiles);
                }}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <SectionHeader title="Local" />

      <label className="flex w-full cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 select-none dark:text-gray-200">
        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            name="shareLocation"
            disabled={isPending}
            checked={shareLocation}
            onChange={(e) => {
              const checked = e.target.checked;
              setShareLocation(checked);
              if (!checked) {
                setCoords(null);
                setLocationError(null);
              }
            }}
            className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-md border border-gray-300 bg-gray-50 transition-colors duration-200 checked:border-[#50be91] checked:bg-[#50be91] focus-visible:ring-2 focus-visible:ring-[#50be91] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:focus-visible:ring-offset-gray-900"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none h-3.5 w-3.5 scale-50 text-[#1e4937] opacity-0 transition-all duration-200 ease-out peer-checked:scale-100 peer-checked:opacity-100"
          >
            <title>Selecionado</title>
            <path d="M5 12l5 5L20 7" />
          </svg>
        </span>
        Compartilhar minha localização atual
      </label>

      {shareLocation && !coords && !locationError && (
        <p className="w-full text-sm text-gray-500 dark:text-gray-400">
          Obtendo sua localização...
        </p>
      )}

      {locationError && (
        <p className="w-full text-sm text-red-700 dark:text-red-300">
          {locationError}
        </p>
      )}

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
          attachmentErrors.length > 0 ||
          (shareLocation && !coords) ||
          (informAddress &&
            (!zipCode.trim() ||
              !city.trim() ||
              !district.trim() ||
              !street.trim() ||
              !number.trim()))
        }
        className="h-12 w-fit cursor-pointer rounded-4xl bg-[#50be91] px-4 font-bold text-[#1e4937] transition hover:bg-[#50be90d3] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Enviando..." : "Criar Postagem"}
      </button>
    </form>
  );
}

function createPostFormData(input: NewPostMutationInput): FormData {
  const formData = new FormData();

  formData.set("title", input.title);
  formData.set("content", input.content);
  formData.set("postType", String(input.postType));
  formData.set("informAddress", String(input.informAddress));
  formData.set("shareLocation", String(input.shareLocation));

  for (const tagId of input.tagIds) {
    formData.append("tagIds", String(tagId));
  }

  for (const field of ["zipCode", "city", "district", "street", "number"] as const) {
    const value = input[field];

    if (value) {
      formData.set(field, value);
    }
  }

  if (input.latitude != null) {
    formData.set("latitude", String(input.latitude));
  }

  if (input.longitude != null) {
    formData.set("longitude", String(input.longitude));
  }

  for (const file of input.attachments) {
    formData.append("attachments", file, file.name);
  }

  return formData;
}

function fileToAttachmentDescriptor(file: File) {
  return {
    originalName: file.name,
    contentType: file.type,
    size: file.size,
  };
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  const kib = size / 1024;

  if (kib < 1024) {
    return `${kib.toFixed(1)} KiB`;
  }

  return `${(kib / 1024).toFixed(1)} MiB`;
}
