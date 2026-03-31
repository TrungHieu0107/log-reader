// removed React import

export interface StatusBarProps {
  activeFileName: string;
  activeLanguage: string;
  activeEncoding: string;
  isCompareMode: boolean;
  onLanguageChange: () => void;
  onEncodingChange: (encoding: string) => void;
}

export function StatusBar({
  activeFileName,
  activeLanguage,
  activeEncoding,
  isCompareMode,
  onLanguageChange,
  onEncodingChange,
}: StatusBarProps) {
  const handleEncodingChange = () => {
    // Basic cycle or prompt, could fire an event or open a generic select.
    // For now, depending on the parent, this might not do much inside the bar itself 
    // without a dropdown. But as per Phase 5, we make it clickable.
    const newEnc = window.prompt('Enter new encoding:', activeEncoding);
    if (newEnc) {
      onEncodingChange(newEnc);
    }
  };

  return (
    <div
      className="flex flex-row items-center justify-between text-xs px-2 select-none"
      style={{
        backgroundColor: '#007ACC',
        color: 'white',
        height: '22px',
        width: '100%',
      }}
    >
      {/* Left items */}
      <div className="flex flex-row items-center space-x-4">
        <span className="cursor-pointer hover:bg-black/20 px-1 py-[2px] rounded" title="Active File">
          {activeFileName || 'No file active'}
        </span>
        <span className="cursor-pointer hover:bg-black/20 px-1 py-[2px] rounded" onClick={onLanguageChange} title="Change Language">
          {activeLanguage || 'SQL'}
        </span>
        <span className="cursor-pointer hover:bg-black/20 px-1 py-[2px] rounded" onClick={handleEncodingChange} title="Change Encoding">
          {activeEncoding || 'UTF-8'}
        </span>
        {isCompareMode && (
          <span className="bg-yellow-500 text-black px-1 rounded">Compare Mode</span>
        )}
      </div>

      {/* Right items */}
      <div className="flex flex-row items-center space-x-4">
        <span className="cursor-pointer hover:bg-black/20 px-1 py-[2px] rounded">
          UTF-8 (App)
        </span>
        <span className="cursor-pointer hover:bg-black/20 px-1 py-[2px] rounded">Log Reader</span>
      </div>
    </div>
  );
}
