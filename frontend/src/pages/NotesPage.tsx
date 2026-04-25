import { DemoHeader } from "@/components/shell/DemoHeader";
import { mockNotesList } from "@/data/mockNotesList";

export function NotesPage() {
  return (
    <div>
      <DemoHeader
        title="협업 메모"
        subtitle="팀과 함께 메모하고 아이디어를 나누세요"
        right={
          <button
            type="button"
            className="px-4 py-2 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-lg text-sm font-medium"
          >
            + 새 메모
          </button>
        }
      />

      <div className="px-10 py-8">
        <div className="grid grid-cols-3 gap-4">
          {mockNotesList.map((note) => (
            <div
              key={note.id}
              className="bg-white rounded-xl p-5 border border-toss-gray-100 hover:border-toss-blue transition cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${note.categoryClass}`}
                >
                  {note.categoryLabel}
                </span>
                <span className="text-xs text-toss-gray-400">
                  {note.updatedLabel}
                </span>
              </div>
              <h3 className="font-bold mb-2">{note.title}</h3>
              <p className="text-sm text-toss-gray-500 line-clamp-3 mb-4">
                {note.preview}
              </p>
              <div className="flex items-center gap-2">
                {note.participants.length > 0 ? (
                  <div className="flex -space-x-2">
                    {note.participants.map((p, idx) => (
                      <div
                        key={idx}
                        className={`w-6 h-6 ${p.bg} text-white text-[10px] font-medium rounded-full flex items-center justify-center border-2 border-white`}
                      >
                        {p.initial}
                      </div>
                    ))}
                  </div>
                ) : null}
                <span className="text-xs text-toss-gray-500">
                  {note.participantsLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
