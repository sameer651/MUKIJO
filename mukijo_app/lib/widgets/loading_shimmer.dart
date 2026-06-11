import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../core/app_theme.dart';

class LoadingShimmer extends StatelessWidget {
  final int itemCount;
  final double itemHeight;

  const LoadingShimmer({super.key, this.itemCount = 5, this.itemHeight = 80});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: itemCount,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => Shimmer.fromColors(
        baseColor: AppTheme.bgCard,
        highlightColor: AppTheme.bgLight,
        child: Container(
          height: itemHeight,
          decoration: BoxDecoration(
            color: AppTheme.bgCard,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}

class ShimmerBox extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const ShimmerBox({
    super.key,
    required this.width,
    required this.height,
    this.radius = 8,
  });

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppTheme.bgCard,
      highlightColor: AppTheme.bgLight,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}
