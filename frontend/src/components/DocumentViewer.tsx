import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Document as PDFDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { getDocumentUrl } from "../lib/api";
import type { Document } from "../types";
import { Button } from "./ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

const MIN_WIDTH = 280;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 400;

interface DocumentViewerProps {
	documents: Document[];
	activeDocument: Document | null;
	onSelectDocument: (id: string) => void;
}

export function DocumentViewer({
	documents,
	activeDocument,
	onSelectDocument,
}: DocumentViewerProps) {
	const [numPages, setNumPages] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState(1);
	const [pdfLoading, setPdfLoading] = useState(true);
	const [pdfError, setPdfError] = useState<string | null>(null);
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [dragging, setDragging] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setDragging(true);

			const startX = e.clientX;
			const startWidth = width;

			const handleMouseMove = (moveEvent: MouseEvent) => {
				const delta = startX - moveEvent.clientX;
				const newWidth = Math.min(
					MAX_WIDTH,
					Math.max(MIN_WIDTH, startWidth + delta),
				);
				setWidth(newWidth);
			};

			const handleMouseUp = () => {
				setDragging(false);
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};

			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		},
		[width],
	);

	const handleSelectDocument = useCallback(
		(id: string) => {
			onSelectDocument(id);
			setCurrentPage(1);
			setPdfLoading(true);
			setPdfError(null);
			setNumPages(0);
		},
		[onSelectDocument],
	);

	const pdfPageWidth = width - 48;

	if (documents.length === 0) {
		return null;
	}

	return (
		<div
			ref={containerRef}
			style={{ width }}
			className="relative flex h-full flex-shrink-0 flex-col border-l border-neutral-200 bg-white"
		>
			{/* Resize handle */}
			<div
				className={`absolute top-0 left-0 z-10 h-full w-1.5 cursor-col-resize transition-colors hover:bg-neutral-300 ${
					dragging ? "bg-neutral-400" : ""
				}`}
				onMouseDown={handleMouseDown}
			/>

			{/* Document list panel */}
			{documents.length > 1 && (
				<div className="border-b border-neutral-100 bg-neutral-50 px-3 py-2">
					<p className="mb-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wide">
						Documents ({documents.length})
					</p>
					<div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
						{documents.map((doc) => (
							<button
								key={doc.id}
								type="button"
								onClick={() => handleSelectDocument(doc.id)}
								className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
									activeDocument?.id === doc.id
										? "bg-neutral-200 text-neutral-900 font-medium"
										: "text-neutral-600 hover:bg-neutral-100"
								}`}
							>
								<FileText className="h-3 w-3 flex-shrink-0 text-neutral-400" />
								<span className="truncate">{doc.filename}</span>
								<span className="ml-auto flex-shrink-0 text-neutral-400">
									{doc.page_count}p
								</span>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Active document header */}
			{activeDocument && (
				<div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
					<div className="min-w-0">
						<p className="truncate text-sm font-medium text-neutral-800">
							{activeDocument.filename}
						</p>
						<p className="text-xs text-neutral-400">
							{activeDocument.page_count} page
							{activeDocument.page_count !== 1 ? "s" : ""}
						</p>
					</div>
				</div>
			)}

			{/* PDF content */}
			{activeDocument && (
				<div className="flex-1 overflow-y-auto p-4">
					{pdfError && (
						<div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
							{pdfError}
						</div>
					)}

					<PDFDocument
						key={activeDocument.id}
						file={getDocumentUrl(activeDocument.id)}
						onLoadSuccess={({ numPages: pages }) => {
							setNumPages(pages);
							setPdfLoading(false);
							setPdfError(null);
						}}
						onLoadError={(error) => {
							setPdfError(`Failed to load PDF: ${error.message}`);
							setPdfLoading(false);
						}}
						loading={
							<div className="flex items-center justify-center py-12">
								<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
							</div>
						}
					>
						{!pdfLoading && !pdfError && (
							<Page
								pageNumber={currentPage}
								width={pdfPageWidth}
								loading={
									<div className="flex items-center justify-center py-12">
										<Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
									</div>
								}
							/>
						)}
					</PDFDocument>
				</div>
			)}

			{/* Page navigation */}
			{numPages > 0 && (
				<div className="flex items-center justify-center gap-3 border-t border-neutral-100 px-4 py-2.5">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						disabled={currentPage <= 1}
						onClick={() =>
							setCurrentPage((p) => Math.max(1, p - 1))
						}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="text-xs text-neutral-500">
						Page {currentPage} of {numPages}
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						disabled={currentPage >= numPages}
						onClick={() =>
							setCurrentPage((p) => Math.min(numPages, p + 1))
						}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
