import { useState, useRef, useEffect } from 'react'
import { MapPin, Navigation, Search, Loader2, Check, Hash } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'
import { useToast } from '../../hooks/useToast'
import { useNotificationStore } from '../../store/notificationStore'
import { locationService, getErrorMessage } from '../../api'
import { cn } from '../../lib/utils'

export function LocationPicker({ value, onChange, error }) {
  const toast = useToast()
  const [mode, setMode] = useState(value ? 'selected' : 'choose')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [postcode, setPostcode] = useState('')
  const [postcodeLoading, setPostcodeLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)

  const debouncedQuery = useDebounce(searchQuery, 400)

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults([])
      return
    }

    let cancelled = false
    setSearchLoading(true)

    locationService.searchLocations(debouncedQuery)
      .then((results) => {
        if (!cancelled) {
          setSearchResults(results)
          setShowResults(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          useNotificationStore.getState().addToast({
            type: 'error',
            title: 'Search failed',
            message: 'Could not search locations. Try again.',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectLocation = (location) => {
    onChange(location)
    setMode('selected')
    setShowResults(false)
    setSearchQuery('')
    setPostcode('')
    toast.success('Location set', location.label)
  }

  const handleUseCurrentLocation = async () => {
    setGpsLoading(true)
    try {
      toast.info('Finding you…', 'Allow location access when your browser asks.')
      const location = await locationService.resolveCurrentLocation()
      selectLocation(location)
    } catch (err) {
      toast.error('Location unavailable', getErrorMessage(err, 'Could not get your location'))
      setMode('search')
    } finally {
      setGpsLoading(false)
    }
  }

  const handlePostcodeLookup = async () => {
    if (!postcode.trim()) return
    setPostcodeLoading(true)
    try {
      const location = await locationService.lookupUkPostcode(postcode)
      selectLocation(location)
    } catch (err) {
      toast.error('Postcode lookup failed', getErrorMessage(err, 'Could not find that postcode'))
    } finally {
      setPostcodeLoading(false)
    }
  }

  const handlePostcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handlePostcodeLookup()
    }
  }

  const clearSelection = () => {
    onChange(null)
    setMode('choose')
  }

  if (mode === 'selected' && value) {
    return (
      <div>
        <label className="block text-sm font-medium mb-2 text-text-primary dark:text-text-dark-primary">
          Farm location
        </label>
        <div
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg border',
            'bg-primary/5 border-primary/30 dark:bg-primary/10'
          )}
        >
          <div className="p-2 rounded-md bg-primary/15 shrink-0">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-text-primary dark:text-text-dark-primary">
              {value.label}
            </p>
            {value.postcode && (
              <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5 font-mono">
                {value.postcode}
              </p>
            )}
            <p className="text-xs text-text-muted dark:text-text-dark-muted mt-1 capitalize">
              via {value.source === 'gps' ? 'GPS' : value.source}
            </p>
          </div>
          <Check className="h-5 w-5 text-success shrink-0" aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="mt-2 text-sm text-primary hover:underline min-h-[48px]"
        >
          Change location
        </button>
        {error && (
          <p className="mt-1.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-text-primary dark:text-text-dark-primary">
        Farm location
      </label>

      {/* Primary: current location */}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={gpsLoading}
        className={cn(
          'w-full flex items-center gap-3 p-4 rounded-lg border-2 border-primary/40 mb-4',
          'bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/15',
          'transition-colors min-h-[56px] text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
        )}
      >
        <div className="p-2 rounded-full bg-primary text-white shrink-0">
          {gpsLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Navigation className="h-5 w-5" />
          )}
        </div>
        <div>
          <p className="font-medium text-text-primary dark:text-text-dark-primary">
            {gpsLoading ? 'Getting your location…' : 'Use my current location'}
          </p>
          <p className="text-xs text-text-secondary dark:text-text-dark-secondary">
            Fastest option — we'll ask for browser permission
          </p>
        </div>
      </button>

      <div className="relative flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border dark:bg-border-dark" />
        <span className="text-xs text-text-muted dark:text-text-dark-muted shrink-0">
          or search
        </span>
        <div className="flex-1 h-px bg-border dark:bg-border-dark" />
      </div>

      {/* Search */}
      <div className="relative mb-4" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setMode('search')
          }}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          placeholder="Search town, city, or region…"
          className={cn(
            'w-full h-12 pl-11 pr-10 rounded-md border min-h-[48px]',
            'bg-surface dark:bg-surface-dark border-border dark:border-border-dark',
            'text-text-primary dark:text-text-dark-primary placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-primary'
          )}
          autoComplete="off"
        />
        {searchLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-text-muted" />
        )}

        {showResults && searchResults.length > 0 && (
          <ul
            className={cn(
              'absolute z-20 w-full mt-1 rounded-lg border shadow-card-hover overflow-hidden',
              'bg-surface dark:bg-surface-dark border-border dark:border-border-dark',
              'max-h-56 overflow-y-auto'
            )}
            role="listbox"
          >
            {searchResults.map((result) => (
              <li key={result.id} role="option">
                <button
                  type="button"
                  onClick={() => selectLocation(result)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-alt dark:hover:bg-surface-dark-alt min-h-[48px] transition-colors"
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary dark:text-text-dark-primary truncate">
                      {result.label}
                    </p>
                    {result.fullLabel && result.fullLabel !== result.label && (
                      <p className="text-xs text-text-muted dark:text-text-dark-muted truncate">
                        {result.fullLabel}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* UK Postcode */}
      <div className="rounded-lg border border-border dark:border-border-dark p-4 bg-surface-alt/50 dark:bg-surface-dark-alt/50">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-medium text-text-primary dark:text-text-dark-primary">
            UK postcode
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
            onKeyDown={handlePostcodeKeyDown}
            placeholder="e.g. NE1 4LP"
            className={cn(
              'flex-1 h-12 px-4 rounded-md border min-h-[48px] font-mono uppercase',
              'bg-surface dark:bg-surface-dark border-border dark:border-border-dark',
              'text-text-primary dark:text-text-dark-primary placeholder:normal-case placeholder:font-sans',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              locationService.isUkPostcode(postcode) && 'border-primary'
            )}
          />
          <button
            type="button"
            onClick={handlePostcodeLookup}
            disabled={postcodeLoading || !postcode.trim()}
            className={cn(
              'shrink-0 px-4 h-12 rounded-md font-medium text-sm min-h-[48px]',
              'bg-primary text-white hover:bg-primary-dark disabled:opacity-50',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            )}
          >
            {postcodeLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Look up'}
          </button>
        </div>
        <p className="text-xs text-text-muted dark:text-text-dark-muted mt-2">
          Powered by postcodes.io — free UK postcode lookup
        </p>
      </div>

      {error && (
        <p className="mt-2 text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
