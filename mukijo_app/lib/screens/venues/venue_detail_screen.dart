import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/app_theme.dart';
import '../../core/session.dart';
import '../../providers/venues_provider.dart';
import '../../models/venue.dart';
import '../../models/slot.dart';

class VenueDetailScreen extends ConsumerStatefulWidget {
  final int venueId;
  const VenueDetailScreen({super.key, required this.venueId});

  @override
  ConsumerState<VenueDetailScreen> createState() => _VenueDetailScreenState();
}

class _VenueDetailScreenState extends ConsumerState<VenueDetailScreen> {
  Slot? _selectedSlot;
  bool _isBooking = false;

  @override
  Widget build(BuildContext context) {
    final venuesAsync = ref.watch(venuesProvider);
    final slotsAsync = ref.watch(venueSlotsProvider(widget.venueId));
    final dateStr = ref.watch(venueSelectedDateProvider);

    return Scaffold(
      backgroundColor: AppTheme.bgLight,
      appBar: AppBar(
        title: const Text('VENUE DETAILS'),
        backgroundColor: AppTheme.bgLight,
        scrolledUnderElevation: 0,
      ),
      body: SafeArea(
        child: venuesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text(e.toString(), style: const TextStyle(color: AppTheme.textSecondary))),
          data: (venues) {
            final venue = venues.firstWhere(
              (v) => v.id == widget.venueId,
              orElse: () => Venue(
                id: widget.venueId,
                ownerId: 0,
                name: 'Unknown Venue',
                location: 'Unknown Location',
                sportsSupported: [],
                amenities: [],
                rating: 5.0,
              ),
            );

            return Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildVenueHeader(venue),
                        const SizedBox(height: 24),
                        _buildSlotsHeader(context, dateStr),
                        const SizedBox(height: 16),
                        _buildSlotsGrid(slotsAsync),
                      ],
                    ),
                  ),
                ),
                _buildBookingFooter(venue),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildVenueHeader(Venue venue) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.borderColor),
      ),
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
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Row(
                children: [
                  const Icon(Icons.star, color: Colors.amber, size: 18),
                  const SizedBox(width: 4),
                  Text(
                    venue.rating.toStringAsFixed(1),
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.location_on, color: AppTheme.textMuted, size: 16),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  venue.location,
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'This arena offers premium quality playing surfaces, changing room facilities, and is highly accessible within local hubs.',
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.5),
          ),
          if (venue.amenities.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text(
              'AMENITIES',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.0,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: venue.amenities.map((amenity) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle_outline, color: AppTheme.primary, size: 14),
                    const SizedBox(width: 6),
                    Text(
                      amenity,
                      style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              )).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSlotsHeader(BuildContext context, String dateStr) {
    final parsedDate = DateTime.tryParse(dateStr) ?? DateTime.now();
    final formatter = DateFormat('EEE, dd MMM yyyy');

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          'AVAILABLE TIME SLOTS',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 13,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: parsedDate,
              firstDate: DateTime.now().subtract(const Duration(days: 30)),
              lastDate: DateTime.now().add(const Duration(days: 90)),
              builder: (context, child) {
                return Theme(
                  data: Theme.of(context).copyWith(
                    colorScheme: ColorScheme.dark(
                      primary: AppTheme.primary,
                      onPrimary: Colors.black,
                      surface: AppTheme.bgCard,
                      onSurface: AppTheme.textPrimary,
                    ),
                  ),
                  child: child!,
                );
              },
            );
            if (picked != null) {
              final newDateStr = picked.toIso8601String().split('T')[0];
              ref.read(venueSelectedDateProvider.notifier).state = newDateStr;
              setState(() {
                _selectedSlot = null; // Clear selection on date change
              });
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.borderColor),
            ),
            child: Row(
              children: [
                Text(
                  formatter.format(parsedDate),
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w700),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.calendar_month, color: AppTheme.primary, size: 16),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSlotsGrid(AsyncValue<List<Slot>> slotsAsync) {
    return slotsAsync.when(
      loading: () => const Center(child: Padding(
        padding: EdgeInsets.all(32.0),
        child: CircularProgressIndicator(),
      )),
      error: (e, st) => Center(child: Text(e.toString(), style: const TextStyle(color: AppTheme.textSecondary))),
      data: (slots) {
        if (slots.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 40.0),
              child: Column(
                children: [
                  Icon(Icons.schedule_outlined, color: AppTheme.primary.withValues(alpha: 0.25), size: 48),
                  const SizedBox(height: 12),
                  const Text(
                    'No slots found for this date. Check another calendar date.',
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.4,
          ),
          itemCount: slots.length,
          itemBuilder: (context, index) {
            final slot = slots[index];
            final isSelected = _selectedSlot?.id == slot.id;
            final isBlocked = slot.isBlocked;

            String formatTime(DateTime dt) {
              return DateFormat('hh:mm a').format(dt);
            }

            return InkWell(
              onTap: isBlocked
                  ? null
                  : () {
                      setState(() {
                        _selectedSlot = isSelected ? null : slot;
                      });
                    },
              borderRadius: BorderRadius.circular(12),
              child: Opacity(
                opacity: isBlocked ? 0.4 : 1.0,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppTheme.primary.withValues(alpha: 0.08)
                        : AppTheme.bgCard,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? AppTheme.primary : AppTheme.borderColor,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        formatTime(slot.startTime),
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        slot.sport.toUpperCase(),
                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '₹${slot.currentPrice}',
                        style: TextStyle(
                          color: AppTheme.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildBookingFooter(Venue venue) {
    final hasSelection = _selectedSlot != null;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        border: const Border(top: BorderSide(color: AppTheme.borderColor)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('SELECTED SLOT', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(
                  hasSelection
                      ? '${DateFormat('hh:mm a').format(_selectedSlot!.startTime)} (${_selectedSlot!.sport})'
                      : 'None Selected',
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Transform(
            transform: Matrix4.skewX(-0.1),
            child: ElevatedButton(
              onPressed: (!hasSelection || _isBooking) ? null : _handleBooking,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              ),
              child: _isBooking
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                    )
                  : const Text('CONFIRM INSTANT BOOKING'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleBooking() async {
    if (_selectedSlot == null) return;
    setState(() {
      _isBooking = true;
    });

    try {
      final ownerId = await Session.getOwnerId();
      final targetUserId = ownerId > 0 ? ownerId : 9; // fallback
      
      final result = await ref.read(venuesNotifierProvider.notifier).bookSlot(
            userId: targetUserId,
            slotId: _selectedSlot!.id,
            amountPaid: _selectedSlot!.currentPrice,
          );
      
      if (mounted) {
        // Refresh slots query
        ref.invalidate(venueSlotsProvider(widget.venueId));
        setState(() {
          _selectedSlot = null;
          _isBooking = false;
        });

        // Show Success Dialog
        _showResultDialog(
          title: 'BOOKING CONFIRMED!',
          message: 'Successfully booked slot for ₹${result['amount_paid']}! Status: ${result['status']}',
          isSuccess: true,
        );
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _isBooking = false;
        });

        // Show Error Dialog
        _showResultDialog(
          title: 'BOOKING CONFLICT',
          message: error.toString().contains('already booked') 
              ? 'This slot was already booked in a concurrent request.'
              : error.toString(),
          isSuccess: false,
        );
      }
    }
  }

  void _showResultDialog({
    required String title,
    required String message,
    required bool isSuccess,
  }) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppTheme.bgCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: isSuccess ? AppTheme.primary : AppTheme.error, width: 1.5),
          ),
          title: Text(
            title,
            style: TextStyle(
              color: isSuccess ? AppTheme.primary : AppTheme.error,
              fontWeight: FontWeight.w900,
              fontStyle: FontStyle.italic,
              fontSize: 18,
            ),
          ),
          content: Text(
            message,
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
          ),
          actions: [
            Transform(
              transform: Matrix4.skewX(-0.1),
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('GOT IT'),
              ),
            ),
          ],
        );
      },
    );
  }
}
