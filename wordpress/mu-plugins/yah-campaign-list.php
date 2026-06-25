<?php
/**
 * Plugin Name:       Yayasan Al-Hidayah — Campaign List API
 * Plugin URI:        https://donasi.yayasanalhidayah.com
 * Description:       Exposes a PUBLIC list of ALL donasiaja campaigns (slug + live stats) at /wp-json/yah/v1/campaigns so the Astro site can auto-discover newly added campaigns. donasiaja stores campaigns outside the standard REST/search surface, so the Astro sync can only ever update slugs it already knows — this endpoint is the missing "list everything" source. Must-use plugin — auto-active, survives donasiaja updates.
 * Version:           2.0.0
 * Author:            Yayasan Al-Hidayah
 * License:           GPL-2.0-or-later
 *
 * ───────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 *   donasiaja (v2.x) does NOT expose campaigns through wp/v2 REST, the sitemap,
 *   WP search, oEmbed, or any public archive — only per-slug HTML at
 *   /campaign/<slug> and admin-only admin-ajax DataTables. So the Astro
 *   "Sync dari WP" button can refresh stats for slugs ALREADY in its programs
 *   table, but it can never DISCOVER a campaign you just created in WP.
 *
 *   This plugin reads the WordPress DB directly and serves the full list.
 *   It auto-detects HOW donasiaja stores campaigns:
 *     (A) as a hidden custom post type (most likely — /campaign/<slug> is a
 *         rewrite, and the campaign body is an Elementor Canvas template), or
 *     (B) in a donasiaja-owned custom table.
 *   Detection is by fingerprint: it looks for the known public slugs (below)
 *   in wp_posts.post_name first, then in custom tables.
 *
 * INSTALL
 *   1. Upload this file to: /wp-content/mu-plugins/yah-campaign-list.php
 *      (create the mu-plugins folder if absent — it sits beside /plugins).
 *   2. mu-plugins auto-activate; no admin click, no permalink flush needed.
 *   3. Verify (public):
 *        https://donasi.yayasanalhidayah.com/wp-json/yah/v1/campaigns
 *      → JSON array of every campaign with slug + stats.
 *   4. If that array is empty or wrong, hit the diagnostic (replace SECRET with
 *      the value of YAH_DIAG_KEY below):
 *        https://donasi.yayasanalhidayah.com/wp-json/yah/v1/diag?key=SECRET
 *      and send the output back — it reveals where/how campaigns are stored so
 *      the detection can be pinned exactly.
 *
 * SECURITY
 *   /campaigns exposes only public campaign facts (title, slug, public stats) —
 *   the same data already visible on each /campaign/<slug> page. /diag is
 *   guarded by YAH_DIAG_KEY and returns table/column names + ONE sample row for
 *   mapping; change the key below before relying on it, and you may delete this
 *   file once discovery is wired and stable.
 * ───────────────────────────────────────────────────────────────────────────
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Shared secret for the /diag endpoint. CHANGE THIS to any random string.
if ( ! defined( 'YAH_DIAG_KEY' ) ) {
	define( 'YAH_DIAG_KEY', 'yah-diag-7c1f9a2e' );
}

// Known public campaign slugs — used to fingerprint where campaigns live.
// These are slugs already confirmed reachable at /campaign/<slug>. Extra/old
// ones are harmless; detection only needs a couple to match.
const YAH_KNOWN_SLUGS = array(
	'raih-ampunan-dan-rahmat-dengan-bayar-kafarat',
	'sempurnakan-taubatmu-tunaikan-kafarat',
	'jangan-biarkan-kafarat-sumpahmu-menggantung-hingga-hari-kiamat',
	'dana-siaga-bencana',
	'tunaikan-fidyah-bersama-alhidayah',
	'allah-tidak-menutup-ampunan',
	'kewajiban-itu-tidak-hilang-meski-sudah-lama-berlalu',
	'tebus-sumpah-yang-pernah-kamu-ucap',
);

/**
 * Detect the post_type donasiaja uses for campaigns by matching known slugs
 * against wp_posts.post_name. Cached in a transient for an hour. Returns the
 * post_type string, or '' if campaigns are not stored as posts.
 */
function yah_detect_campaign_post_type() {
	global $wpdb;

	$cached = get_transient( 'yah_campaign_post_type' );
	if ( $cached !== false ) {
		return $cached; // may be '' (a valid "not a CPT" result)
	}

	$placeholders = implode( ',', array_fill( 0, count( YAH_KNOWN_SLUGS ), '%s' ) );
	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$sql  = "SELECT post_type, COUNT(*) AS n FROM {$wpdb->posts}
	         WHERE post_name IN ($placeholders) AND post_status = 'publish'
	         GROUP BY post_type ORDER BY n DESC LIMIT 1";
	$type = $wpdb->get_var( $wpdb->prepare( $sql, YAH_KNOWN_SLUGS ) );
	$type = is_string( $type ) ? $type : '';

	set_transient( 'yah_campaign_post_type', $type, HOUR_IN_SECONDS );
	return $type;
}

/**
 * Pull a numeric-ish stat out of a post's meta by scanning key names — mirrors
 * the Astro side so we never hardcode donasiaja's internal meta-key names.
 */
function yah_pick_meta( array $meta, array $needles ) {
	foreach ( $meta as $key => $val ) {
		$k = strtolower( $key );
		foreach ( $needles as $n ) {
			if ( strpos( $k, $n ) !== false && $val !== '' && $val !== null ) {
				return $val;
			}
		}
	}
	return null;
}

/** Strip "Rp", thousands separators, stray text → int or null. */
function yah_parse_int( $raw ) {
	if ( $raw === null ) {
		return null;
	}
	$digits = preg_replace( '/[^0-9]/', '', (string) $raw );
	return $digits === '' ? null : (int) $digits;
}

/**
 * The donasiaja campaign table. donasiaja uses the wpda_ DB prefix (NOT WP's
 * own $wpdb->prefix), so we hardcode-with-fallback: try the known name, then
 * discover any *_dja_campaign table in the schema.
 */
function yah_campaign_table() {
	global $wpdb;
	static $resolved = null;
	if ( $resolved !== null ) {
		return $resolved;
	}
	$candidates = array( 'wpda_dja_campaign', $wpdb->prefix . 'dja_campaign' );
	foreach ( $candidates as $t ) {
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $t ) ) === $t ) {
			$resolved = $t;
			return $resolved;
		}
	}
	// Last resort: any table ending in dja_campaign (not _update).
	$like = '%dja\_campaign';
	$hit  = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT TABLE_NAME FROM information_schema.TABLES
			 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE %s LIMIT 1",
			$like
		)
	);
	$resolved = is_string( $hit ) ? $hit : '';
	return $resolved;
}

/** Column names of the campaign table (lower-cased), cached. */
function yah_campaign_columns( $table ) {
	global $wpdb;
	if ( ! $table ) {
		return array();
	}
	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$cols = $wpdb->get_col( "SHOW COLUMNS FROM `$table`" );
	return is_array( $cols ) ? $cols : array();
}

/** First column whose name contains any needle (case-insensitive). */
function yah_match_col( array $cols, array $needles ) {
	foreach ( $cols as $c ) {
		$lc = strtolower( $c );
		foreach ( $needles as $n ) {
			if ( strpos( $lc, $n ) !== false ) {
				return $c;
			}
		}
	}
	return null;
}

/**
 * Build the public campaign list from the donasiaja custom table
 * (wpda_dja_campaign). Column names are auto-detected so we tolerate schema
 * differences between donasiaja versions. The Astro side only strictly needs
 * slug + title (stats come from the per-slug HTML scrape, which is exact), but
 * we surface target/raised/donatur too when the columns are present.
 */
function yah_collect_campaigns() {
	global $wpdb;
	$out   = array();
	$table = yah_campaign_table();
	if ( ! $table ) {
		return $out; // table not found — see /diag
	}

	$cols = yah_campaign_columns( $table );
	if ( ! $cols ) {
		return $out;
	}

	// Exact column names (donasiaja v2.x), with heuristic fallback so we still
	// work if a future version renames them.
	$has        = static function ( $c ) use ( $cols ) { return in_array( $c, $cols, true ) ? $c : null; };
	$col_slug   = $has( 'slug' )          ?: yah_match_col( $cols, array( 'slug', 'permalink', 'url_campaign' ) );
	$col_title  = $has( 'title' )         ?: yah_match_col( $cols, array( 'title', 'judul', 'nama' ) );
	$col_id     = $has( 'campaign_id' )   ?: yah_match_col( $cols, array( 'campaign_id', 'id_campaign' ) );
	$col_target = $has( 'target' )        ?: yah_match_col( $cols, array( 'target', 'goal' ) );
	$col_image  = $has( 'image_url' )     ?: yah_match_col( $cols, array( 'image', 'thumbnail', 'banner' ) );
	$col_status = $has( 'publish_status' ) ?: yah_match_col( $cols, array( 'publish_status', 'is_publish', 'active', 'aktif' ) );
	$col_pk     = $has( 'id' ) ?: 'id';

	if ( ! $col_slug ) {
		return $out; // can't map without a slug column
	}

	$select = array( "`$col_slug` AS slug" );
	if ( $col_title )  { $select[] = "`$col_title` AS title"; }
	if ( $col_id )     { $select[] = "`$col_id` AS campaign_id"; }
	if ( $col_target ) { $select[] = "`$col_target` AS target"; }
	if ( $col_image )  { $select[] = "`$col_image` AS image_url"; }
	$select_sql = implode( ', ', $select );

	// Only LIVE campaigns: publish_status = 1. Unpublished rows redirect to the
	// WP homepage at /campaign/<slug>, so they must not reach the Astro sync.
	$where = $col_status ? " WHERE `$col_status` = 1" : '';

	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$rows = $wpdb->get_results( "SELECT $select_sql FROM `$table`$where ORDER BY `$col_pk` DESC" );
	if ( ! is_array( $rows ) ) {
		return $out;
	}

	foreach ( $rows as $r ) {
		$slug = isset( $r->slug ) ? trim( (string) $r->slug ) : '';
		// Some installs store a full URL in the slug column — keep just the slug.
		if ( strpos( $slug, '/' ) !== false ) {
			$slug = trim( basename( rtrim( $slug, '/' ) ) );
		}
		if ( $slug === '' ) {
			continue;
		}
		$out[] = array(
			'campaign_id' => isset( $r->campaign_id ) ? (string) $r->campaign_id : null,
			'slug'        => $slug,
			'title'       => isset( $r->title ) ? html_entity_decode( wp_strip_all_tags( (string) $r->title ), ENT_QUOTES, 'UTF-8' ) : '',
			'target'      => isset( $r->target ) ? yah_parse_int( $r->target ) : null,
			'image'       => isset( $r->image_url ) && $r->image_url ? (string) $r->image_url : null,
		);
	}

	return $out;
}

add_action( 'rest_api_init', static function () {
	// Public: the full campaign list for Astro auto-discovery.
	register_rest_route(
		'yah/v1',
		'/campaigns',
		array(
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => static function () {
				$items = yah_collect_campaigns();
				return new WP_REST_Response(
					array(
						'count'     => count( $items ),
						'table'     => yah_campaign_table(),
						'campaigns' => $items,
					),
					200
				);
			},
		)
	);

	// Guarded diagnostic: reveals how/where campaigns are stored so detection
	// can be pinned if /campaigns comes back empty. Returns table + columns +
	// ONE sample row. Requires ?key=YAH_DIAG_KEY.
	register_rest_route(
		'yah/v1',
		'/diag',
		array(
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => static function ( WP_REST_Request $req ) {
				if ( (string) $req->get_param( 'key' ) !== YAH_DIAG_KEY ) {
					return new WP_REST_Response( array( 'error' => 'forbidden' ), 403 );
				}
				global $wpdb;
				$report = array();

				$table = yah_campaign_table();
				$report['table'] = $table;

				if ( $table ) {
					// Full column list of the campaign table.
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$report['columns'] = $wpdb->get_results( "SHOW COLUMNS FROM `$table`" );

					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$report['row_count'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM `$table`" );

					// One sample row; long text truncated to keep the payload small.
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$sample = $wpdb->get_row( "SELECT * FROM `$table` LIMIT 1", ARRAY_A );
					if ( is_array( $sample ) ) {
						foreach ( $sample as $k => $v ) {
							if ( is_string( $v ) && strlen( $v ) > 160 ) {
								$sample[ $k ] = substr( $v, 0, 160 ) . '…[' . strlen( $v ) . ' chars]';
							}
						}
					}
					$report['sample_row'] = $sample;
				}

				// donasiaja campaign-related custom tables (context).
				$report['custom_tables'] = $wpdb->get_col(
					"SELECT TABLE_NAME FROM information_schema.TABLES
					 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME REGEXP 'dja_campaign|dja_donate'"
				);

				return new WP_REST_Response( $report, 200 );
			},
		)
	);
} );
