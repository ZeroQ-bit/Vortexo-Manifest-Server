package main

import "testing"

func TestStructuredPlexArtworkKeepsLandscapeTileSeparateFromBackground(t *testing.T) {
	html := `
		<script>
			{"orientation":"landscape","size":"m","id":"tv.plex.provider.discover-123/extras/456","image":{"url":"https:\/\/metadata-static.plex.tv\/extras\/iva\/123\/landscape.jpg"}}
			{"backgroundLandscape":{"image":{"url":"https:\/\/metadata-static.plex.tv\/b\/gracenote\/background.jpg"}}}
			{"clearLogo":{"url":"https:\/\/metadata-static.plex.tv\/logo.png"}}
		</script>
	`

	artwork := structuredPlexArtwork(html)
	if len(artwork.Landscape) != 1 || artwork.Landscape[0] != "https://metadata-static.plex.tv/extras/iva/123/landscape.jpg" {
		t.Fatalf("expected extras landscape tile, got %#v", artwork.Landscape)
	}
	if len(artwork.CoverArt) != 1 || artwork.CoverArt[0] != artwork.Landscape[0] {
		t.Fatalf("expected coverArt to mirror landscape tile, got %#v", artwork.CoverArt)
	}
	if len(artwork.Background) != 1 || artwork.Background[0] != "https://metadata-static.plex.tv/b/gracenote/background.jpg" {
		t.Fatalf("expected backgroundLandscape to stay background-only, got %#v", artwork.Background)
	}
	if len(artwork.ClearLogo) != 1 || artwork.ClearLogo[0] != "https://metadata-static.plex.tv/logo.png" {
		t.Fatalf("expected clear logo, got %#v", artwork.ClearLogo)
	}
}

func TestCachedPlexArtworkAppliesShowLandscapeToEpisodeWatchState(t *testing.T) {
	state := &appState{
		plexArtwork: map[string]plexArtworkCacheRecord{},
	}
	record := plexArtworkCacheRecord{
		plexArtworkEntry: plexArtworkEntry{
			Version:   1,
			MediaType: "tv",
			TMDBID:    12345,
			Title:     "Ghosts",
			Artwork: plexArtwork{
				Landscape:  []string{"https://metadata-static.plex.tv/extras/iva/ghosts/landscape.jpg"},
				Background: []string{"https://metadata-static.plex.tv/g/gracenote/ghosts-background.jpg"},
				ClearLogo:  []string{"https://metadata-static.plex.tv/ghosts-logo.png"},
			},
		},
		Status: "ok",
	}
	state.plexArtwork[plexArtworkKey(record.MediaType, record.TMDBID, record.IMDBID, record.Title, record.Year)] = record

	item := watchStateItem{
		MediaType:     "episode",
		ParentTitle:   "Ghosts",
		Title:         "Episode",
		TMDBID:        12345,
		Season:        5,
		Episode:       17,
		LandscapePath: "https://i.ytimg.com/vi/fallback/hq720.jpg",
		BackdropPath:  "https://image.tmdb.org/t/p/original/background.jpg",
	}

	state.applyCachedPlexArtworkToWatchStateItem(&item)

	if item.LandscapePath != record.Artwork.Landscape[0] {
		t.Fatalf("expected cached Plex landscape, got %q", item.LandscapePath)
	}
	if item.BackdropPath != record.Artwork.Background[0] {
		t.Fatalf("expected cached Plex background, got %q", item.BackdropPath)
	}
	if item.LogoPath != record.Artwork.ClearLogo[0] {
		t.Fatalf("expected cached Plex logo, got %q", item.LogoPath)
	}
}
