DO $$ DECLARE v_lesson_id uuid; BEGIN
  SELECT id INTO v_lesson_id FROM lessons WHERE module_id = '9a681ce2-e300-404e-be2c-a081e6795ade' AND order_index = 0;
  IF v_lesson_id IS NULL THEN
    INSERT INTO lessons (course_id, module_id, institution_id, title, order_index, content_type, content_url, is_required)
    VALUES ('823fe330-1df4-42ee-89af-d7df079958f5', '9a681ce2-e300-404e-be2c-a081e6795ade', '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'Introduction', 0, 'blocks', '', true)
    RETURNING id INTO v_lesson_id;
  END IF;
  DELETE FROM lesson_blocks WHERE lesson_id = v_lesson_id;
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', 'Introduction to the Fundraising Strategies that Drive Results Module ', '{"html":"<p>In this module, learners will learn how to creatively and effectively find ways to raise funds for their organization. </p>\n<img src=\"fit_content_assets/0001-1234417221942330153_vix2hh.png\" alt=\"\" />\n<p>Author: Lanre Tunji-Ajayi M.S.M </p><p>Image credits: <a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"http://www.freepik.com\">www.freepik.com</a> and Canva</p>","media":[{"type":"image","url":"fit_content_assets/0001-1234417221942330153_vix2hh.png"}],"mode":"scrolling"}'::jsonb, 0, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'cta', '', '{"action":"complete_lesson","text":"Nice work. You''ve completed this lesson.","button_label":"Exit Lesson"}'::jsonb, 1, true, 1, '{}'::jsonb); END $$;