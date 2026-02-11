"use client";

import { Button, Flex, Input } from "@lumia-ui/components";

type UsersToolbarProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSearchSubmit: () => void;
  onInvite: () => void;
};

export function UsersToolbar({
  searchValue,
  onSearchValueChange,
  onSearchSubmit,
  onInvite,
}: UsersToolbarProps) {
  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
      <Button
        type="button"
        className="h-10 w-full gap-2 sm:w-auto"
        onClick={onInvite}
      >
        <Flex className="items-center gap-2">
          <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
          Invite People
        </Flex>
      </Button>
      <form
        className="flex w-full items-center gap-2 sm:w-auto"
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit();
        }}
      >
        <Input
          id="user-search"
          name="userSearch"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search for users… (e.g., ada@xynes.com)"
          aria-label="Search for Users"
          value={searchValue}
          onChange={(event) => onSearchValueChange(event.target.value)}
          className="h-10 w-full border-border bg-background text-foreground sm:w-[384px]"
        />
        <Button type="submit" variant="primary" className="h-10">
          Search
        </Button>
      </form>
    </div>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
      <path d="M5 19a7 7 0 0 1 14 0" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  );
}
