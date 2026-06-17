import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/app_theme.dart';
import '../../core/session.dart';
import '../../providers/venues_provider.dart';
import '../../models/venue.dart';
import '../../widgets/loading_shimmer.dart';

class VenuesScreen extends ConsumerWidget {
  const VenuesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final venuesAsync = ref.watch(venuesProvider);
    final sportFilter = ref.watch(venueSportFilterProvider);
    final searchQuery = ref.watch(venueSearchQueryProvider);

    return Scaffold(
      backgroundColor: AppTheme.bgLight,
      appBar: AppBar(
        title: const Text('VENUES & ARENAS'),
        backgroundColor: AppTheme.bgLight,
        scrolledUnderElevation: 0,
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(venuesProvider),
          color: AppTheme.primary,
          backgroundColor: AppTheme.bgCard,
          child: Column(
            children: [
              // Search and filters toolbar
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    _buildSearchBar(context, ref, searchQuery),
                    const SizedBox(height: 12),
                    _buildSportFilters(ref, sportFilter),
                  ],
                ),
              ),

              // Venues List Area
              Expanded(
                child: venuesAsync.when(
                  loading: () => const LoadingShimmer(itemCount: 4),
                  error: (e, _) => Center(
                    child: Text(e.toString(), style: const TextStyle(color: AppTheme.textSecondary)),
                  ),
                  data: (venues) {
                    if (venues.isEmpty) {
                      return _buildEmptyState(context, ref);
                    }
                    return ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                      itemCount: venues.length,
                      itemBuilder: (context, index) {
                        final venue = venues[index];
                        return _buildVenueCard(context, venue)
                            .animate()
                            .fade(duration: 300.ms, delay: (index * 50).ms)
                            .slideY(begin: 0.1);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context, WidgetRef ref, String query) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: TextField(
        controller: TextEditingController(text: query)..selection = TextSelection.fromPosition(TextPosition(offset: query.length)),
        style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
        onChanged: (val) => ref.read(venueSearchQueryProvider.notifier).state = val,
        decoration: const InputDecoration(
          hintText: 'Search location or arena name...',
          hintStyle: TextStyle(color: AppTheme.textMuted),
          prefixIcon: Icon(Icons.search, color: AppTheme.textMuted, size: 20),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildSportFilters(WidgetRef ref, String activeSport) {
    final sports = ['all', 'football', 'badminton', 'cricket', 'tennis', 'pickleball'];
    return SizedBox(
      height: 38,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: sports.length,
        itemBuilder: (context, index) {
          final sport = sports[index];
          final isActive = activeSport == sport;
          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: Transform(
              transform: Matrix4.skewX(-0.1),
              child: ChoiceChip(
                label: Text(
                  sport.toUpperCase(),
                  style: TextStyle(
                    color: isActive ? Colors.black : AppTheme.textSecondary,
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                selected: isActive,
                onSelected: (selected) {
                  if (selected) {
                    ref.read(venueSportFilterProvider.notifier).state = sport;
                  }
                },
                selectedColor: AppTheme.primary,
                backgroundColor: AppTheme.bgCard,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: BorderSide(
                    color: isActive ? Colors.transparent : AppTheme.borderColor,
                    width: 1,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildVenueCard(BuildContext context, Venue venue) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16.0),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/venues/${venue.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Cover Mock / Banner
            Container(
              height: 120,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1E1E28), Color(0xFF12121A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Center(
                child: Icon(
                  Icons.sports_soccer_outlined,
                  size: 48,
                  color: AppTheme.primary.withValues(alpha: 0.15),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          venue.name.toUpperCase(),
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            fontStyle: FontStyle.italic,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 16),
                          const SizedBox(width: 4),
                          Text(
                            venue.rating.toStringAsFixed(1),
                            style: const TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on, color: AppTheme.textMuted, size: 14),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          venue.location,
                          style: const TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Sports Supported Tags
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: venue.sportsSupported.map((sport) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary.withValues(alpha: 0.08),
                        border: Border.all(color: AppTheme.secondary.withValues(alpha: 0.15)),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        sport.toUpperCase(),
                        style: const TextStyle(
                          color: AppTheme.secondary,
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    )).toList(),
                  ),
                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        'INSTANTLY BOOK →',
                        style: TextStyle(
                          color: AppTheme.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.location_off_outlined,
              size: 64,
              color: AppTheme.primary.withValues(alpha: 0.25),
            ),
            const SizedBox(height: 16),
            const Text(
              'NO VENUES FOUND',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w800,
                fontStyle: FontStyle.italic,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'There are no venues registered. Pre-populate demo arenas to start testing.',
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 13,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Transform(
              transform: Matrix4.skewX(-0.1),
              child: ElevatedButton.icon(
                onPressed: () async {
                  final ownerId = await Session.getOwnerId();
                  final targetId = ownerId > 0 ? ownerId : 9; // Fallback to test ID
                  await ref.read(venuesNotifierProvider.notifier).prePopulateDemo(targetId);
                  ref.invalidate(venuesProvider);
                },
                icon: const Icon(Icons.flash_on, size: 18),
                label: const Text('PRE-POPULATE DEMO ARENAS'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
