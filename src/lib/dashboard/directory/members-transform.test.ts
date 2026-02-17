import { describe, expect, it } from "vitest";
import {
  filterDirectoryMembers,
  getDirectoryUiState,
  sortDirectoryMembers,
  toDirectoryMembers,
  unwrapGatewayData,
  type DirectorySortOption,
} from "./members-transform";

describe("unwrapGatewayData", () => {
  it("unwraps nested gateway data envelopes", () => {
    const payload = {
      ok: true,
      data: {
        data: {
          members: [{ userId: "u1" }],
        },
      },
    };

    expect(unwrapGatewayData(payload)).toEqual({
      members: [{ userId: "u1" }],
    });
  });
});

describe("toDirectoryMembers", () => {
  it("normalizes members and maps role labels", () => {
    const members = toDirectoryMembers({
      members: [
        {
          userId: "u1",
          email: "ada@xynes.com",
          displayName: "Ada Lovelace",
          avatarUrl: null,
          status: "active",
          joinedAt: "2026-02-01T10:00:00.000Z",
          roleKey: "workspace_owner",
        },
        {
          userId: "u2",
          email: "member@xynes.com",
          displayName: null,
          avatarUrl: null,
          status: "active",
          joinedAt: "2026-01-01T10:00:00.000Z",
          roleKey: "workspace_member",
        },
      ],
    });

    expect(members).toHaveLength(2);
    expect(members[0]).toMatchObject({
      id: "u1",
      name: "Ada Lovelace",
      designation: "Owner",
    });
    expect(members[1]).toMatchObject({
      id: "u2",
      name: "member",
      designation: "Member",
    });
  });

  it("drops malformed member records", () => {
    const members = toDirectoryMembers({
      members: [
        { userId: "u1", email: "ok@xynes.com", roleKey: "workspace_member" },
        { userId: 2, email: "bad@xynes.com", roleKey: "workspace_owner" },
      ],
    });

    expect(members).toHaveLength(1);
    expect(members[0]?.id).toBe("u1");
  });
});

describe("filterDirectoryMembers", () => {
  it("filters by name, email, and designation", () => {
    const members = toDirectoryMembers({
      members: [
        {
          userId: "u1",
          email: "ada@xynes.com",
          displayName: "Ada Lovelace",
          roleKey: "workspace_owner",
        },
        {
          userId: "u2",
          email: "grace@xynes.com",
          displayName: "Grace Hopper",
          roleKey: "workspace_member",
        },
      ],
    });

    expect(filterDirectoryMembers(members, "grace")).toHaveLength(1);
    expect(filterDirectoryMembers(members, "owner")).toHaveLength(1);
    expect(filterDirectoryMembers(members, "@xynes.com")).toHaveLength(2);
  });
});

describe("sortDirectoryMembers", () => {
  const members = toDirectoryMembers({
    members: [
      {
        userId: "u1",
        email: "charlie@xynes.com",
        displayName: "Charlie",
        joinedAt: "2026-01-01T10:00:00.000Z",
        roleKey: "workspace_member",
      },
      {
        userId: "u2",
        email: "alice@xynes.com",
        displayName: "Alice",
        joinedAt: "2026-03-01T10:00:00.000Z",
        roleKey: "workspace_owner",
      },
      {
        userId: "u3",
        email: "bob@xynes.com",
        displayName: "Bob",
        joinedAt: "2026-02-01T10:00:00.000Z",
        roleKey: "workspace_admin",
      },
    ],
  });

  const assertOrder = (sort: DirectorySortOption, expected: string[]) => {
    const sorted = sortDirectoryMembers(members, sort);
    expect(sorted.map((item) => item.id)).toEqual(expected);
  };

  it("supports date and name sorting", () => {
    assertOrder("joined_desc", ["u2", "u3", "u1"]);
    assertOrder("joined_asc", ["u1", "u3", "u2"]);
    assertOrder("name_asc", ["u2", "u3", "u1"]);
    assertOrder("name_desc", ["u1", "u3", "u2"]);
  });
});

describe("getDirectoryUiState", () => {
  it("disables bulk controls when result count is one or fewer", () => {
    expect(getDirectoryUiState(0)).toEqual({
      isSelectAllDisabled: true,
      isSortDisabled: true,
    });
    expect(getDirectoryUiState(1)).toEqual({
      isSelectAllDisabled: true,
      isSortDisabled: true,
    });
  });

  it("enables bulk controls for multiple results", () => {
    expect(getDirectoryUiState(2)).toEqual({
      isSelectAllDisabled: false,
      isSortDisabled: false,
    });
  });
});
