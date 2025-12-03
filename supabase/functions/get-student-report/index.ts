// Deno Edge Function: get-student-report
// Public function to fetch student, participations and attendance by matricula

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matricula } = await req.json();

    if (!matricula) {
      return new Response(JSON.stringify({ error: "matricula is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[get-student-report] fetching student:", matricula);

    const { data: student, error: studentError } = await supabase
      .from("estudantes")
      .select("*")
      .eq("matricula", matricula)
      .maybeSingle();

    if (studentError) {
      console.error("studentError", studentError);
      return new Response(JSON.stringify({ error: studentError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!student) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: participations, error: partError } = await supabase
      .from("participacoes_projeto")
      .select(`
        *,
        projetos:project_id (
          name,
          description
        )
      `)
      .eq("student_id", student.id);

    if (partError) {
      console.error("participations error", partError);
    }

    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from("registros_presenca")
      .select(`
        *,
        participacoes_projeto!inner (
          student_id,
          project_id
        )
      `)
      .eq("participacoes_projeto.student_id", student.id);

    if (attendanceError) {
      console.error("attendance error", attendanceError);
    }

    return new Response(
      JSON.stringify({
        student,
        participations: participations ?? [],
        attendanceRecords: attendanceRecords ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("unhandled error", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});