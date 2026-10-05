from decimal import Decimal
from rest_framework.exceptions import ValidationError


class UOMConverter:
    """
    Precision Unit of Measure conversion engine.
    Ensures safe, Decimal-accurate mathematical conversions and rejects incompatible dimensions.
    """

    # Standard metric conversion mappings (base unit normalized)
    WEIGHT_FACTORS = {
        'kg': Decimal('1000.0'),
        'kilogram': Decimal('1000.0'),
        'kilograms': Decimal('1000.0'),
        'g': Decimal('1.0'),
        'gram': Decimal('1.0'),
        'grams': Decimal('1.0'),
        'mg': Decimal('0.001'),
        'milligram': Decimal('0.001'),
    }

    VOLUME_FACTORS = {
        'l': Decimal('1000.0'),
        'liter': Decimal('1000.0'),
        'liters': Decimal('1000.0'),
        'ltr': Decimal('1000.0'),
        'ml': Decimal('1.0'),
        'milliliter': Decimal('1.0'),
        'milliliters': Decimal('1.0'),
    }

    COUNT_UNITS = {
        'pcs', 'pc', 'piece', 'pieces', 'portion', 'portions',
        'slice', 'slices', 'unit', 'units', 'can', 'cans', 'bottle', 'bottles'
    }

    @classmethod
    def convert(cls, quantity, source_uom, target_uom):
        """
        Converts a Decimal quantity from source_uom to target_uom.
        """
        if quantity is None:
            return Decimal('0.0000')

        qty = Decimal(str(quantity))

        if source_uom is None or target_uom is None:
            return qty

        # Identical instance or identical short code
        if source_uom == target_uom:
            return qty

        src_code = (source_uom.short_code or source_uom.name or '').strip().lower()
        tgt_code = (target_uom.short_code or target_uom.name or '').strip().lower()

        if src_code == tgt_code:
            return qty

        # 1. Weight Conversion
        if src_code in cls.WEIGHT_FACTORS and tgt_code in cls.WEIGHT_FACTORS:
            # Convert source to grams, then grams to target
            grams = qty * cls.WEIGHT_FACTORS[src_code]
            target_val = grams / cls.WEIGHT_FACTORS[tgt_code]
            return target_val

        # 2. Volume Conversion
        if src_code in cls.VOLUME_FACTORS and tgt_code in cls.VOLUME_FACTORS:
            # Convert source to milliliters, then milliliters to target
            ml = qty * cls.VOLUME_FACTORS[src_code]
            target_val = ml / cls.VOLUME_FACTORS[tgt_code]
            return target_val

        # 3. Discrete Count / Piece Units
        if src_code in cls.COUNT_UNITS and tgt_code in cls.COUNT_UNITS:
            return qty

        # 4. Database-driven custom UOM conversions
        if getattr(source_uom, 'base_unit_id', None) == getattr(target_uom, 'id', None):
            factor = source_uom.conversion_factor or Decimal('1.0000')
            return qty * factor

        if getattr(target_uom, 'base_unit_id', None) == getattr(source_uom, 'id', None):
            factor = target_uom.conversion_factor or Decimal('1.0000')
            if factor > Decimal('0.0000'):
                return qty / factor

        if getattr(source_uom, 'base_unit_id', None) and getattr(target_uom, 'base_unit_id', None):
            if source_uom.base_unit_id == target_uom.base_unit_id:
                src_factor = source_uom.conversion_factor or Decimal('1.0000')
                tgt_factor = target_uom.conversion_factor or Decimal('1.0000')
                if tgt_factor > Decimal('0.0000'):
                    base_qty = qty * src_factor
                    return base_qty / tgt_factor

        # Incompatible units
        raise ValidationError(
            f"Incompatible units of measure: Cannot convert '{source_uom.short_code or source_uom.name}' "
            f"to inventory item base unit '{target_uom.short_code or target_uom.name}'."
        )
