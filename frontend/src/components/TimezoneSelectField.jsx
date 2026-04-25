import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

const matchesSearch = (value, query) =>
  String(value || "")
    .toLowerCase()
    .includes(String(query || "").trim().toLowerCase());

const normalizeOption = (option) => {
  if (typeof option === "string") {
    return {
      value: option,
      label: option,
      triggerLabel: option,
      primaryText: option,
      secondaryText: "",
      tertiaryText: "",
      searchText: option,
      abbreviation: "",
      longName: "",
      currentTime: "",
      utcOffset: "",
      gmtOffset: "",
      zonePath: option,
    };
  }

  const normalized = option || {};
  return {
    value: normalized.value,
    label: normalized.label || normalized.value || "",
    triggerLabel:
      normalized.triggerLabel || normalized.label || normalized.value || "",
    primaryText:
      normalized.primaryText || normalized.label || normalized.value || "",
    secondaryText: normalized.secondaryText || "",
    tertiaryText: normalized.tertiaryText || "",
    searchText:
      normalized.searchText ||
      [
        normalized.label,
        normalized.value,
        normalized.primaryText,
        normalized.secondaryText,
        normalized.tertiaryText,
      ]
        .filter(Boolean)
        .join(" "),
    abbreviation: normalized.abbreviation || "",
    longName: normalized.longName || "",
    currentTime: normalized.currentTime || "",
    utcOffset: normalized.utcOffset || "",
    gmtOffset: normalized.gmtOffset || "",
    zonePath: normalized.zonePath || normalized.primaryText || normalized.value || "",
  };
};

export default function TimezoneSelectField({
  label,
  selectId,
  value,
  onChange,
  options = [],
  leadingOptions = [],
  helperText = "",
  error = "",
  required = false,
  disabled = false,
  style,
  searchPlaceholder = "Search abbreviation, timezone name, or UTC offset",
}) {
  const generatedId = useId();
  const resolvedId = selectId || `timezone-select-${generatedId}`;
  const rootRef = useRef(null);
  const searchInputRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const normalizedLeadingOptions = useMemo(
    () => leadingOptions.map((option) => normalizeOption(option)),
    [leadingOptions],
  );

  const normalizedOptions = useMemo(
    () => options.map((option) => normalizeOption(option)),
    [options],
  );

  const selectedOption = useMemo(() => {
    return (
      normalizedLeadingOptions.find((option) => option.value === value) ||
      normalizedOptions.find((option) => option.value === value) ||
      null
    );
  }, [normalizedLeadingOptions, normalizedOptions, value]);

  const filteredOptions = useMemo(() => {
    const nextOptions = Array.isArray(normalizedOptions) ? normalizedOptions : [];
    return searchText
      ? nextOptions.filter((option) => matchesSearch(option.searchText, searchText))
      : nextOptions;
  }, [normalizedOptions, searchText]);

  const filteredLeadingOptions = useMemo(() => {
    const nextOptions = Array.isArray(normalizedLeadingOptions)
      ? normalizedLeadingOptions
      : [];
    return searchText
      ? nextOptions.filter((option) => matchesSearch(option.searchText, searchText))
      : nextOptions;
  }, [normalizedLeadingOptions, searchText]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
        setSearchText("");
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearchText("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (disabled) return;
    setIsOpen((current) => {
      const next = !current;
      if (!next) {
        setSearchText("");
      }
      return next;
    });
  };

  const handleOptionSelect = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
    setSearchText("");
  };

  const hasVisibleOptions =
    filteredLeadingOptions.length > 0 || filteredOptions.length > 0;

  const renderOption = (option) => {
    const hasTimezoneColumns =
      option.abbreviation &&
      option.longName &&
      option.currentTime &&
      option.utcOffset &&
      option.gmtOffset;

    if (hasTimezoneColumns) {
      return (
        <>
          <span className="timezone-select-option-main">
            {option.zonePath || option.primaryText}
          </span>
          <div className="timezone-select-option-topline">
            <span className="timezone-select-option-abbr">
              {option.abbreviation}
            </span>
            <span className="timezone-select-option-name">
              {option.longName}
            </span>
          </div>
          <div className="timezone-select-option-metrics">
            <span>{option.currentTime}</span>
            <span>{option.utcOffset}</span>
            <span>{option.gmtOffset}</span>
          </div>
          {option.tertiaryText ? (
            <span className="timezone-select-option-tertiary">
              {option.tertiaryText}
            </span>
          ) : null}
        </>
      );
    }

    return (
      <>
        <span className="timezone-select-option-main">
          {option.primaryText}
        </span>
        {option.secondaryText ? (
          <span className="timezone-select-option-sub">
            {option.secondaryText}
          </span>
        ) : null}
        {option.tertiaryText ? (
          <span className="timezone-select-option-tertiary">
            {option.tertiaryText}
          </span>
        ) : null}
      </>
    );
  };

  return (
    <div className="form-field" style={style} ref={rootRef}>
      <span>{label}{required ? " *" : ""}</span>

      <div className="timezone-select">
        <button
          id={resolvedId}
          type="button"
          className={`timezone-select-trigger${isOpen ? " is-open" : ""}`}
          onClick={toggleOpen}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="timezone-select-value">
            {selectedOption?.triggerLabel || value || "Select timezone"}
          </span>
          <span className="timezone-select-caret" aria-hidden="true">
            {isOpen ? "▲" : "▼"}
          </span>
        </button>

        {isOpen ? (
          <div className="timezone-select-popover">
            <div className="timezone-select-search-wrap">
              <input
                ref={searchInputRef}
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                  }
                }}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="timezone-select-search"
              />
            </div>

            <div className="timezone-select-options" role="listbox">
              <div className="timezone-select-header">
                <span>Timezone / Name</span>
                <span>Current Time / UTC / GMT</span>
              </div>

              {filteredLeadingOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`timezone-select-option${
                    option.value === value ? " is-selected" : ""
                  }`}
                  onClick={() => handleOptionSelect(option.value)}
                >
                  {renderOption(option)}
                </button>
              ))}

              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`timezone-select-option${
                    option.value === value ? " is-selected" : ""
                  }`}
                  onClick={() => handleOptionSelect(option.value)}
                >
                  {renderOption(option)}
                </button>
              ))}

              {!hasVisibleOptions ? (
                <div className="timezone-select-empty">No matching timezones</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {helperText ? <span className="muted-text">{helperText}</span> : null}
      {error ? <span className="error-text">{error}</span> : null}
    </div>
  );
}
