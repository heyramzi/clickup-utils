/**
 * clickup chat — List channels and read messages
 */

import * as client from "../client.js";
import { requireConfigWithTeam } from "../config.js";
import { type Column, color, printJson, printTable, progress, useJson } from "../output.js";

// ── List channels ─────────────────────────────────────

interface ChannelRow {
	id: string;
	name: string;
	type: string;
	visibility: string;
	updated: string;
}

const channelColumns: Column<ChannelRow>[] = [
	{ key: "id", label: "ID", maxWidth: 30 },
	{ key: "name", label: "Name", maxWidth: 40 },
	{ key: "type", label: "Type", maxWidth: 12 },
	{ key: "visibility", label: "Visibility", maxWidth: 10 },
	{ key: "updated", label: "Updated", maxWidth: 18 },
];

function formatTimestamp(ts: string | undefined): string {
	if (!ts) return "";
	const d = new Date(ts);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export async function runChatListCommand(opts: {
	json?: boolean;
	limit?: string;
	team?: string;
}): Promise<void> {
	const config = requireConfigWithTeam();
	const teamId = opts.team || config.teamId;

	progress("Fetching chat channels...");
	const res = await client.getChatChannels(config.apiToken, teamId, {
		limit: opts.limit ? parseInt(opts.limit, 10) : 25,
	});

	if (useJson(opts)) {
		printJson(res);
		return;
	}

	const rows: ChannelRow[] = res.data.map((ch) => ({
		id: ch.id,
		name: ch.name || color.dim("(unnamed)"),
		type: ch.type ?? "",
		visibility: ch.visibility ?? "",
		updated: formatTimestamp(ch.latest_comment_at || ch.updated_at),
	}));

	printTable(rows, channelColumns);

	if (res.next_cursor) {
		console.log(color.dim(`\n  More channels available. Use --limit or pagination cursor.`));
	}
}

// ── Read messages ─────────────────────────────────────

interface MessageRow {
	id: string;
	user: string;
	date: string;
	content: string;
	replies: string;
}

const messageColumns: Column<MessageRow>[] = [
	{ key: "id", label: "ID", maxWidth: 20 },
	{ key: "user", label: "User", maxWidth: 14 },
	{ key: "date", label: "Date", maxWidth: 18 },
	{ key: "content", label: "Content", maxWidth: 60 },
	{ key: "replies", label: "Replies", maxWidth: 8 },
];

function formatEpochMs(ts: number): string {
	const d = new Date(ts);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function truncateContent(content: string, max: number): string {
	const oneLine = content.replace(/\n/g, " ").trim();
	if (oneLine.length <= max) return oneLine;
	return oneLine.slice(0, max - 1) + "\u2026";
}

export async function runChatReadCommand(
	channelId: string,
	opts: {
		json?: boolean;
		limit?: string;
		team?: string;
	},
): Promise<void> {
	const config = requireConfigWithTeam();
	const teamId = opts.team || config.teamId;

	progress("Fetching messages...");
	const res = await client.getChatMessages(config.apiToken, teamId, channelId, {
		limit: opts.limit ? parseInt(opts.limit, 10) : 25,
	});

	if (useJson(opts)) {
		printJson(res);
		return;
	}

	if (res.data.length === 0) {
		console.log(color.dim("  No messages in this channel."));
		return;
	}

	// Display messages in chronological order (API returns newest first)
	const messages = [...res.data].reverse();

	for (const msg of messages) {
		const date = formatEpochMs(msg.date);
		const userLabel = msg.user_id;
		const header = `${color.bold(userLabel)} ${color.dim(date)}`;
		const repliesInfo = msg.replies_count > 0 ? color.cyan(` [${msg.replies_count} replies]`) : "";

		console.log(`${header}${repliesInfo}`);
		console.log(`  ${msg.content.trim()}`);
		if (msg.resolved) console.log(color.green("  [Resolved]"));
		console.log("");
	}

	if (res.next_cursor) {
		console.log(color.dim("  More messages available. Use --limit to fetch more."));
	}
}
