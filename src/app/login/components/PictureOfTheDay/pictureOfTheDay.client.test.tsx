import { describe, expect, it } from "vitest";
import PictureOfTheDay from "./pictureOfTheDay.client";

describe("PictureOfTheDay login re-export", () => {
	it("exposes the shared PictureOfTheDay component", () => {
		expect(typeof PictureOfTheDay).toBe("function");
	});
});
