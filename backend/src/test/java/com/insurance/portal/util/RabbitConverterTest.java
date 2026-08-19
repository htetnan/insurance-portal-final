package com.insurance.portal.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RabbitConverterTest {

    @Test
    void matchesRabbitUnicodeToZawgyiSamples() {
        assertEquals("မဂၤလာပါ", RabbitConverter.unicodeToZawgyi("မင်္ဂလာပါ"));
        assertEquals("ျမန္မာလိုေျပာမယ္လကြာ", RabbitConverter.unicodeToZawgyi("မြန်မာလိုပြောမယ်လကွာ"));
        assertEquals("Rabbit ကြန္ဗက္တာကို သိလား", RabbitConverter.unicodeToZawgyi("Rabbit ကွန်ဗက်တာကို သိလား"));
    }

    @Test
    void doesNotDoubleConvertExistingZawgyiText() {
        assertEquals("မဂၤလာပါ", RabbitConverter.unicodeToZawgyi("မဂၤလာပါ"));
    }
}
