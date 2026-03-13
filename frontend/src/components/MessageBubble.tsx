import { motion } from "framer-motion";
import { Bot, FileText } from "lucide-react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import type { Citation, Document, Message } from "../types";

interface MessageBubbleProps {
	message: Message;
	documents?: Document[];
	onCitationClick?: (filename: string, page: number) => void;
}

function parseCitations(content: string): Citation[] {
	const regex = /\[📄\s*([^,\]]+),\s*Page\s*(\d+)\]/gi;
	const citations: Citation[] = [];
	const seen = new Set<string>();
	let match;
	while ((match = regex.exec(content)) !== null) {
		const filename = match[1]?.trim();
		const page = parseInt(match[2] ?? "0", 10);
		const key = `${filename}-${page}`;
		if (filename && !seen.has(key)) {
			seen.add(key);
			citations.push({ filename, page });
		}
	}
	return citations;
}

export function MessageBubble({
	message,
	documents = [],
	onCitationClick,
}: MessageBubbleProps) {
	if (message.role === "system") {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.2 }}
				className="flex justify-center py-2"
			>
				<p className="text-xs text-neutral-400">{message.content}</p>
			</motion.div>
		);
	}

	if (message.role === "user") {
		return (
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex justify-end py-1.5"
			>
				<div className="max-w-[75%] rounded-2xl rounded-br-md bg-neutral-100 px-4 py-2.5">
					<p className="whitespace-pre-wrap text-sm text-neutral-800">
						{message.content}
					</p>
				</div>
			</motion.div>
		);
	}

	// Assistant message
	const couldNotFind = message.content
		.toLowerCase()
		.includes("could not find");
	const citations = parseCitations(message.content);

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2 }}
			className="flex gap-3 py-1.5"
		>
			<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900">
				<Bot className="h-4 w-4 text-white" />
			</div>
			<div className="min-w-0 max-w-[80%]">
				{couldNotFind && (
					<div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
						<span className="text-sm">⚠️</span>
						<p className="text-xs text-amber-700 font-medium">
							The AI could not find this in your documents
						</p>
					</div>
				)}
				<div className="prose">
					<Streamdown>
						{message.content.replace(/\[📄[^\]]+\]/g, "").trim()}
					</Streamdown>
				</div>

				{/* Citation chips */}
				{citations.length > 0 && onCitationClick && (
					<div className="mt-2 flex flex-wrap gap-1.5">
						{citations.map((citation) => {
							const doc = documents.find(
								(d) =>
									d.filename
										.toLowerCase()
										.includes(
											citation.filename.toLowerCase(),
										) ||
									citation.filename
										.toLowerCase()
										.includes(d.filename.toLowerCase()),
							);
							return (
								<div
									key={`${citation.filename}-${citation.page}`}
									role="button"
									onClick={() => {
										if (doc) {
											onCitationClick(
												doc.id,
												citation.page,
											);
										}
									}}
									className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
										doc
											? "cursor-pointer border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
											: "cursor-default border-neutral-200 bg-neutral-50 text-neutral-400"
									}`}
								>
									<FileText className="h-3 w-3" />
									<span>{citation.filename}</span>
									<span className="text-blue-400">
										p.{citation.page}
									</span>
								</div>
							);
						})}
					</div>
				)}

				{message.sources_cited > 0 && (
					<p className="mt-1.5 text-xs text-neutral-400">
						{message.sources_cited} source
						{message.sources_cited !== 1 ? "s" : ""} cited
					</p>
				)}
			</div>
		</motion.div>
	);
}

interface StreamingBubbleProps {
	content: string;
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
	return (
		<div className="flex gap-3 py-1.5">
			<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900">
				<Bot className="h-4 w-4 text-white" />
			</div>
			<div className="min-w-0 max-w-[80%]">
				{content ? (
					<div className="prose">
						<Streamdown mode="streaming">{content}</Streamdown>
					</div>
				) : (
					<div className="flex items-center gap-1 py-2">
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.15s" }}
						/>
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.3s" }}
						/>
					</div>
				)}
				<span className="inline-block h-4 w-0.5 animate-pulse bg-neutral-400" />
			</div>
		</div>
	);
}
