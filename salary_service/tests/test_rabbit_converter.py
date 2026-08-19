import unittest

from app.rabbit_converter import unicode_to_zawgyi


class RabbitConverterTests(unittest.TestCase):
    def test_matches_official_rabbit_samples(self):
        samples = [
            ("မင်္ဂလာပါ", "မဂၤလာပါ"),
            ("မြန်မာလိုပြောမယ်လကွာ", "ျမန္မာလိုေျပာမယ္လကြာ"),
            ("Rabbit ကွန်ဗက်တာကို သိလား", "Rabbit ကြန္ဗက္တာကို သိလား"),
        ]
        for unicode_text, zawgyi_text in samples:
            with self.subTest(unicode_text=unicode_text):
                self.assertEqual(unicode_to_zawgyi(unicode_text), zawgyi_text)

    def test_already_zawgyi_text_is_not_double_converted(self):
        value = "မဂၤလာပါ"
        self.assertEqual(unicode_to_zawgyi(value), value)


if __name__ == "__main__":
    unittest.main()
