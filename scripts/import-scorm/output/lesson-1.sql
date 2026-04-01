DO $$ DECLARE v_lesson_id uuid; BEGIN
  SELECT id INTO v_lesson_id FROM lessons WHERE module_id = 'a4ce8c6c-ea88-45fb-b590-05fb329347c3' AND order_index = 1;
  IF v_lesson_id IS NULL THEN
    INSERT INTO lessons (course_id, module_id, institution_id, title, order_index, content_type, content_url, is_required)
    VALUES ('6b4906f1-803b-40bb-8582-d591220e5d09', 'a4ce8c6c-ea88-45fb-b590-05fb329347c3', '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'Lesson 10: Case Studies', 1, 'blocks', '', true)
    RETURNING id INTO v_lesson_id;
  END IF;
  DELETE FROM lesson_blocks WHERE lesson_id = v_lesson_id;
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', 'GANSID- Bringing Us Together in Advocacy', '{"html":"<p></p>\n<img src=\"fit_content_assets/Roundtable-Lanre_sajqjl_wwadki.jpg\" alt=\"\" />\n<p>Before you complete this advocacy module, we hope to share a few patient advocacy stories with you, and we hope their stories will inspire you to greater work in your own country and region.</p>\n<p></p>\n<p></p>\n<p></p>","media":[{"type":"image","url":"fit_content_assets/Roundtable-Lanre_sajqjl_wwadki.jpg"}],"mode":"scrolling"}'::jsonb, 0, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', '', '{"html":"","mode":"fallback","original_type":"media-collection"}'::jsonb, 1, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'cta', '', '{"action":"complete_lesson","text":"<p>You have completed the Fundamentals of Effective Advocacy Module!</p>","button_label":"Exit Lesson"}'::jsonb, 2, true, 1, '{}'::jsonb); END $$;